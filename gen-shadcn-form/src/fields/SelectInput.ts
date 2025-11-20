import { List, ContentBase } from '@skmtc/core'
import type { GenerateContextType, ListLines, Stringable } from '@skmtc/core'

type SelectInputArgs = {
  context: GenerateContextType
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  destinationPath: string
  enums: string[]
}

export class SelectInput extends ContentBase {
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
    enums
  }: SelectInputArgs) {
    super({ context })

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
