import { List, type ListLines } from '@skmtc/lang-typescript'
import type { OasOperationProjectionConstructorArgs, Stringable } from '@skmtc/core'
import { SnippetBase } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { schemaToField, getLabel } from './schemaToField.ts'
import { toProperties, type EnrichmentSchema } from './enrichments.ts'

export class FormFields extends SnippetBase {
  fields: ListLines<Stringable> | undefined
  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context })

    // Per-field overrides from the subject enrichment, keyed by the leading
    // property of the binding's schemaPath. Carries the consumer-assigned
    // component + `label`.
    const overrides = new Map(
      (settings.enrichments.subject?.fields ?? []).map(field => [
        toProperties(field.moduleSelect.schemaPath)[0],
        field
      ])
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
          input: override?.moduleSelect.module
        })
      })
    })
  }

  override toString() {
    return `${this.fields}`
  }
}
