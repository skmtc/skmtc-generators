import {
  Definition,
  Identifier,
  toGeneratorOnlyKey,
  synthesizeArgsObject,
  capitalize,
  decapitalize
} from '@skmtc/core'
import type { GenerateContextType, GqlOperation, OasObject } from '@skmtc/core'
import { ZodInsertable } from '@skmtc/gen-zod'
import invariant from 'tiny-invariant'
import denoJson from '../deno.json' with { type: 'json' }
import { toExportPath, toFormName } from './base.ts'
import { schemaToField, getLabel } from './schemaToField.ts'
import { toCoerceBlock } from './toCoerceBlock.ts'

const id = denoJson.name

/**
 * Emit a Reapit-elements form for one GraphQL Mutation.
 *
 * Strategy:
 *  1. Synthesize an `OasObject` from the operation arguments.
 *  2. Delegate type emission to `gen-typescript` (input shape) and
 *     `gen-zod` (resolver schema). Both go into the args object's own
 *     normalised model files; the form file just imports the symbols.
 *  3. Emit a single React function component as a {@link Definition}
 *     whose body wires `useForm`, `zodResolver`, `useLens`, and the
 *     per-field components into a `<form>`.
 *
 * Field components are imported from `@/forms/fields`, which the
 * consumer copies once from this package's `template/` directory.
 * Each generated `<XxxField>` accepts a typed lens (`Lens<T>`) plus
 * presentational props — its appearance is consumer-controlled and
 * never overwritten by re-runs. Schema-bound fields (enum selects,
 * comboboxes) are emitted by sibling generators and override the
 * generic dispatch on a per-type basis.
 */
export const emitForm = (context: GenerateContextType, operation: GqlOperation): void => {
  const args = synthesizeArgsObject(operation)
  invariant(args, 'emitForm should not be invoked for zero-argument operations')

  const exportPath = toExportPath(operation)
  const formName = toFormName(operation)
  const base = capitalize(operation.fieldName)

  // Only emit the Zod schema. The TS arg type is derived from it via
  // `z.infer<typeof argsSchema>` — guarantees the form's value type
  // matches `useForm`'s generic so the resolver type lines up. (gen-zod
  // and gen-typescript can otherwise produce subtly-different
  // representations of the same shape — e.g. `(string | null) | undefined`
  // vs `string | null | undefined` — that fail invariance checks on
  // `Resolver<TFieldValues>`.)
  const zodArgs = context.insertNormalisedModel(ZodInsertable, {
    schema: args satisfies OasObject,
    fallbackName: decapitalize(`${base}Args`),
    destinationPath: exportPath
  })
  const zodArgsName = zodArgs.identifier.name
  const tsArgsName = `${capitalize(base)}Args`

  context.register({
    destinationPath: exportPath,
    imports: {
      zod: ['z'],
      'react-hook-form': ['useForm'],
      '@hookform/resolvers/zod': ['zodResolver'],
      '@hookform/lenses': ['useLens'],
      '@reapit/elements': ['Button']
    }
  })

  // Compose one field per top-level argument. Field child instances
  // register their own imports against `exportPath` during construction.
  const required = args.required ?? []
  const fieldLines = Object.entries(args.properties ?? {}).map(([propName, propSchema]) =>
    schemaToField({
      context,
      path: propName,
      label: getLabel({ schema: propSchema, name: propName }),
      isRequired: required.includes(propName),
      schema: propSchema,
      destinationPath: exportPath
    }).toString()
  )
  const fieldsBlock = fieldLines.join('\n')

  // Synthesise a per-form transform from RHF-stored values → GraphQL
  // submit shape. Walks the same args structure as the field dispatch.
  const coerceBlock = toCoerceBlock(args)

  const generatorKey = toGeneratorOnlyKey({ generatorId: id })
  const identifier = Identifier.createVariable(formName)

  // Emit the args type alongside the component as a separate
  // `export type Foo = z.infer<typeof fooSchema>` so the consumer can
  // import it for their `onSubmit` handler typing. We use `defineAndRegister`
  // for the type definition because Definition wraps function-style values
  // in `export const`; the type alias needs different framing.
  const value = {
    generatorKey,
    toString: () => `(props: { onSubmit: (values: ${tsArgsName}) => void }) => {
  const form = useForm<${tsArgsName}>({
    resolver: zodResolver(${zodArgsName})
  })
  const lens = useLens({ control: form.control })

  return (
    <form onSubmit={form.handleSubmit(values => props.onSubmit(${coerceBlock}))}>
      ${fieldsBlock}
      <Button intent="primary" type="submit">Submit</Button>
    </form>
  )
}`
  }

  const argsTypeId = Identifier.createType(tsArgsName)
  context.defineAndRegister({
    identifier: argsTypeId,
    value: { generatorKey, toString: () => `z.infer<typeof ${zodArgsName}>` },
    destinationPath: exportPath
  })

  context.register({
    destinationPath: exportPath,
    definitions: [
      new Definition({ context, identifier, value })
    ]
  })
}
