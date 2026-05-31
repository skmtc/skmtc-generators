import { SnippetBase, List } from '@skmtc/core'
import type { GenerateContextType, ListLines, OasRef, OasSchema, Stringable } from '@skmtc/core'
import { labelText } from './labelText.ts'

export type SelectInputArgs = {
  /** Originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  path: string
  label: string | undefined
  isRequired: boolean
  destinationPath: string
  enums: string[]
}

/**
 * Open-ended single-select for enum-string fields. Emits a
 * `<RawSelectField>` whose children are `<option>` elements baked from
 * the enum literal values.
 *
 * For schema-typed enum selects (where the field type *is* an enum),
 * `gen-reapit-enum-select` generates a stronger-typed
 * `<EnumNameSelectField>` and `gen-reapit-form` defers to that
 * generator.
 */
export class SelectInput extends SnippetBase {
  readonly path: string
  readonly label: string | undefined
  readonly isRequired: boolean
  readonly options: ListLines<Stringable>

  constructor({ context, path, label, isRequired, destinationPath, enums, schema }: SelectInputArgs) {
    super({ context, schema })
    this.path = path
    this.label = label
    this.isRequired = isRequired
    this.options = List.toLines(
      enums.map(value => `<option value="${value}">${value}</option>`)
    )

    this.register({
      destinationPath,
      imports: { '@/forms/fields': ['RawSelectField'] }
    })
  }

  override toString(): string {
    const label = labelText(this.label, this.isRequired)
    return `<RawSelectField lens={lens.focus('${this.path}').defined()}${
      label ? ` label="${label}"` : ''
    }>
${this.options}
</RawSelectField>`
  }
}
