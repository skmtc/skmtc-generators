import { List, type ListLines } from '@skmtc/lang-typescript'
import type { OasOperationProjectionConstructorArgs, Stringable } from '@skmtc/core'
import { SnippetBase } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { schemaToField, getLabel } from './schemaToField.ts'
import type { EnrichmentSchema } from './enrichments.ts'

export class FormFields extends SnippetBase {
  fields: ListLines<Stringable> | undefined
  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context })

    // Per-field overrides from the subject enrichment, keyed by `id` (= the
    // property name). Carries the consumer-assigned `input` component + `label`.
    const overrides = new Map(
      (settings.enrichments.subject?.fields ?? []).map(field => [field.id, field])
    )

    this.fields = operation.toRequestBody(({ schema: parentSchema }) => {
      const resolved = parentSchema.resolve()

      invariant(resolved.type === 'object', 'Operation must have a body with type object')

      return List.fromEntries(resolved.properties ?? {}).toLines(([name, schema]) => {
        const override = overrides.get(name)
        return schemaToField({
          context,
          name,
          schema,
          topLevelSchema: parentSchema,
          skipLabel: false,
          destinationPath: settings.exportPath,
          label: override?.label ?? getLabel({ schema, name }),
          isRequired: Boolean(resolved.required?.includes(name)),
          input: override?.input
        })
      })
    })
  }

  override toString() {
    return `${this.fields}`
  }
}
