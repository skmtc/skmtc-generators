import { toGeneratorOnlyKey, synthesizeArgsObject, capitalize, decapitalize } from '@skmtc/core'
import type { GqlOperationProjectionConstructorArgs, OasObject } from '@skmtc/core'
import { defineAndRegister, createType } from '@skmtc/lang-typescript'
import { ZodProjection } from '@skmtc/gen-zod'
import invariant from 'tiny-invariant'
import denoJson from '../deno.json' with { type: 'json' }
import { ReapitFormBase } from './base.ts'
import type { EnrichmentSchema, FormFieldItem } from './enrichments.ts'
import { schemaToField } from './schemaToField.ts'
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
 * consumer provides. Each generated `<XxxField>` accepts a typed
 * lens (`Lens<T>`) plus presentational props — its appearance is
 * consumer-controlled and never overwritten by re-runs.
 */
export class ReapitForm extends ReapitFormBase {
  zodArgsName: string
  tsArgsName: string
  fieldsBlock: string
  coerceBlock: string
  title: string | undefined
  description: string | undefined
  submitLabel: string

  constructor({
    context,
    operation,
    settings
  }: GqlOperationProjectionConstructorArgs<EnrichmentSchema>) {
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
    const zodArgs = this.insertNormalizedModel(ZodProjection, {
      schema: args satisfies OasObject,
      fallbackName: decapitalize(`${base}Args`)
    })
    this.zodArgsName = zodArgs.identifier.name
    this.tsArgsName = `${capitalize(base)}Args`

    this.title = settings.enrichments?.form?.title
    this.description = settings.enrichments?.form?.description
    this.submitLabel = settings.enrichments?.form?.submitLabel ?? 'Submit'

    const elementsImports: string[] = ['Button', 'FormLayout']
    if (this.title) elementsImports.push('Title')
    if (this.description) elementsImports.push('BodyText')

    this.register({
      imports: {
        zod: ['z'],
        'react-hook-form': ['useForm'],
        '@hookform/resolvers/zod': ['zodResolver'],
        '@hookform/lenses': ['useLens'],
        '@reapit/elements': elementsImports
      }
    })

    // Compose one field per top-level argument. Field child instances
    // register their own imports against `settings.exportPath` during
    // construction. Per-field overrides come from
    // `settings.enrichments?.form?.fields`, keyed by `id` interpreted
    // as the dotted accessor path (so nested overrides like
    // `primaryAddress.type` are supported, not just top-level args).
    const fieldOverrides = new Map<string, FormFieldItem>()
    for (const override of settings.enrichments?.form?.fields ?? []) {
      fieldOverrides.set(override.id, override)
    }
    const required = args.required ?? []
    const fieldLines = Object.entries(args.properties ?? {}).map(([propName, propSchema]) =>
      schemaToField({
        context,
        path: propName,
        isRequired: required.includes(propName),
        schema: propSchema,
        destinationPath: settings.exportPath,
        overrides: fieldOverrides
      }).toString()
    )
    this.fieldsBlock = fieldLines.join('\n')

    // Synthesize a per-form transform from RHF-stored values → GraphQL
    // submit shape. Walks the same args structure as the field-rendering
    // switch.
    this.coerceBlock = toCoerceBlock(args)

    // Sibling type alias: `export type XxxArgs = z.infer<typeof xxxSchema>`.
    // We use a generator-only key here because the alias is shared
    // sibling content in the same file, not the operation's primary
    // Definition (which is the class itself).
    defineAndRegister(context, {
      identifier: createType(this.tsArgsName),
      destinationPath: settings.exportPath,
      value: {
        generatorKey: toGeneratorOnlyKey({ generatorId: id }),
        toString: () => `z.infer<typeof ${this.zodArgsName}>`
      }
    })
  }

  override toString(): string {
    const titleBlock = this.title ? `<Title>${this.title}</Title>\n` : ''
    const descriptionBlock = this.description ? `<BodyText>${this.description}</BodyText>\n` : ''
    return `(props: { onSubmit: (values: ${this.tsArgsName}) => void | Promise<void> }) => {
  const form = useForm<${this.tsArgsName}>({
    resolver: zodResolver(${this.zodArgsName})
  })
  const lens = useLens({ control: form.control })
  const { isSubmitting } = form.formState

  return (
    <form onSubmit={form.handleSubmit(async values => { await props.onSubmit(${this.coerceBlock}) })}>
      ${titleBlock}${descriptionBlock}<FormLayout hasMargin>
        ${this.fieldsBlock}
      </FormLayout>
      <Button intent="primary" type="submit" disabled={isSubmitting} loading={isSubmitting}>${this.submitLabel}</Button>
    </form>
  )
}`
  }
}
