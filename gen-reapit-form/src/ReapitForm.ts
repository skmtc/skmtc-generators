import {
  Identifier,
  toGeneratorOnlyKey,
  synthesizeArgsObject,
  capitalize,
  decapitalize
} from '@skmtc/core'
import type { GqlOperationInsertableArgs, OasObject } from '@skmtc/core'
import { ZodInsertable } from '@skmtc/gen-zod'
import invariant from 'tiny-invariant'
import denoJson from '../deno.json' with { type: 'json' }
import { ReapitFormBase } from './base.ts'
import type { EnrichmentSchema, FormFieldItem } from './enrichments.ts'
import { schemaToField, getLabel } from './schemaToField.ts'
import { toCoerceBlock } from './toCoerceBlock.ts'

const id = denoJson.name

/**
 * Reapit-elements form for one GraphQL Mutation.
 *
 * Strategy:
 *  1. Synthesize an `OasObject` from the operation arguments.
 *  2. Delegate Zod schema emission to `gen-zod`. The TS arg type is
 *     derived from the Zod schema via `z.infer<typeof argsSchema>`.
 *  3. The class itself becomes the form Definition — its `toString()`
 *     returns the function-expression body which the engine wraps in
 *     `export const <FormName> = (...) => { ... }`.
 *
 * Field components are imported from `@/forms/fields`, which the
 * consumer copies once from this package's `template/` directory.
 * Each generated `<XxxField>` accepts a typed lens (`Lens<T>`) plus
 * presentational props — its appearance is consumer-controlled and
 * never overwritten by re-runs.
 */
export class ReapitForm extends ReapitFormBase {
  zodArgsName: string
  tsArgsName: string
  fieldsBlock: string
  coerceBlock: string

  constructor({ context, operation, settings }: GqlOperationInsertableArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const args = synthesizeArgsObject(operation)
    invariant(args, 'ReapitForm should not be invoked for zero-argument operations')

    const base = capitalize(operation.fieldName)

    // Emit Zod for the synthesized args object. TS arg type is derived
    // from this via `z.infer<typeof argsSchema>` so resolver typing
    // matches `useForm`'s generic exactly. (gen-zod and gen-typescript
    // can otherwise produce subtly-different representations of the
    // same shape — e.g. `(string | null) | undefined` vs `string | null
    // | undefined` — that fail invariance checks on `Resolver<TFieldValues>`.)
    const zodArgs = this.insertNormalizedModel(ZodInsertable, {
      schema: args satisfies OasObject,
      fallbackName: decapitalize(`${base}Args`)
    })
    this.zodArgsName = zodArgs.identifier.name
    this.tsArgsName = `${capitalize(base)}Args`

    this.register({
      imports: {
        zod: ['z'],
        'react-hook-form': ['useForm'],
        '@hookform/resolvers/zod': ['zodResolver'],
        '@hookform/lenses': ['useLens'],
        '@reapit/elements': ['Button']
      }
    })

    // Compose one field per top-level argument. Field child instances
    // register their own imports against `settings.exportPath` during
    // construction. Per-field overrides (e.g. `references` for lookup
    // dispatch) come from `settings.enrichments?.fields`, keyed by the
    // top-level argument name.
    const fieldOverrides = new Map<string, FormFieldItem>()
    for (const override of settings.enrichments?.form?.fields ?? []) {
      fieldOverrides.set(override.id, override)
    }
    const required = args.required ?? []
    const fieldLines = Object.entries(args.properties ?? {}).map(([propName, propSchema]) => {
      const override = fieldOverrides.get(propName)
      return schemaToField({
        context,
        path: propName,
        label: override?.label ?? getLabel({ schema: propSchema, name: propName }),
        isRequired: required.includes(propName),
        schema: propSchema,
        destinationPath: settings.exportPath,
        references: override?.references,
        referenceKind: override?.referenceKind
      }).toString()
    })
    this.fieldsBlock = fieldLines.join('\n')

    // Synthesise a per-form transform from RHF-stored values → GraphQL
    // submit shape. Walks the same args structure as the field dispatch.
    this.coerceBlock = toCoerceBlock(args)

    // Sibling type alias: `export type XxxArgs = z.infer<typeof xxxSchema>`.
    // We use a generator-only key here because the alias is shared
    // sibling content in the same file, not the operation's primary
    // Definition (which is the class itself).
    this.defineAndRegister({
      identifier: Identifier.createType(this.tsArgsName),
      value: {
        generatorKey: toGeneratorOnlyKey({ generatorId: id }),
        toString: () => `z.infer<typeof ${this.zodArgsName}>`
      }
    })
  }

  override toString(): string {
    return `(props: { onSubmit: (values: ${this.tsArgsName}) => void }) => {
  const form = useForm<${this.tsArgsName}>({
    resolver: zodResolver(${this.zodArgsName})
  })
  const lens = useLens({ control: form.control })

  return (
    <form onSubmit={form.handleSubmit(values => props.onSubmit(${this.coerceBlock}))}>
      ${this.fieldsBlock}
      <Button intent="primary" type="submit">Submit</Button>
    </form>
  )
}`
  }
}
