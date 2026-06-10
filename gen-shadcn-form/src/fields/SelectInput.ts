import { List } from '@skmtc/core'
import type {
  GenerateContextType,
  ListLines,
  OasRef,
  OasSchema,
  Stringable
} from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'

type SelectInputArgs = {
  context: GenerateContextType
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  destinationPath: string
  enums: string[]
  /** The originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class SelectInput extends TsSnippet {
  name: string
  label: string | undefined

  placeholder?: string
  skipLabel?: boolean
  options: ListLines<Stringable>
  constructor({
    context,
    name,
    label,
    placeholder,
    destinationPath,
    skipLabel,
    enums,
    schema
  }: SelectInputArgs) {
    super({ context, stackTrail: schema?.stackTrail.clone() })

    this.name = name
    this.label = label ?? name
    this.placeholder = placeholder
    this.skipLabel = skipLabel
    this.options = List.toLines(
      enums.map(enumValue => {
        return `<SelectItem value="${enumValue}">${enumValue}</SelectItem>`
      })
    )

    this.register({
      imports: {
        '@/components/fields/select-field': ['SelectField'],
        '@/components/ui/select': ['SelectItem']
      },
      destinationPath
    })
  }

  override toString() {
    return `<SelectField       ${
      this.name ? `lens={lens.focus(\`${this.name}\`).defined()}` : 'lens={lens}'
    } ${this.label && !this.skipLabel ? `label="${this.label}"` : ''}>
    ${this.options}
    </SelectField>`
  }
}
