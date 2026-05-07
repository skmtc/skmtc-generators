import { SnippetBase, List } from '@skmtc/core'
import type { ListLines, OasOperationProjectionConstructorArgs, Stringable } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { schemaToField, getLabel } from './schemaToField.ts'
import type { EnrichmentSchema } from './enrichments.ts'

export class FormFields extends SnippetBase {
  fields: ListLines<Stringable> | undefined

  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context })

    this.fields = operation.toRequestBody(({ schema: parentSchema }) => {
      const resolved = parentSchema.resolve()

      invariant(resolved.type === 'object', 'DaisyForm: request body must be an object')

      return List.fromEntries(resolved.properties ?? {}).toLines(([name, schema]) => {
        return schemaToField({
          context,
          name,
          schema,
          topLevelSchema: parentSchema,
          skipLabel: false,
          destinationPath: settings.exportPath,
          label: getLabel({ schema, name }),
          isRequired: Boolean(resolved.required?.includes(name))
        })
      })
    })
  }

  override toString() {
    return `${this.fields}`
  }
}
