import { TypescriptSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, OasRef, OasSchema } from '@skmtc/core'

type StringInputArgs = {
  context: GenerateContextType
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  destinationPath: string
  /** The originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class StringInput extends TypescriptSnippet {
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  constructor(
    { context, name, label, placeholder, destinationPath, skipLabel, schema }: StringInputArgs
  ) {
    super({ context, schema })

    this.name = name
    this.label = label ?? name
    this.placeholder = placeholder
    this.skipLabel = skipLabel

    this.register({
      imports: { '@/components/fields/string-field': ['StringField'] },
      destinationPath
    })
  }

  override toString() {
    return `<StringField
      ${this.name ? `lens={lens.focus(\`${this.name}\`).defined()}` : 'lens={lens}'}
      ${this.label && !this.skipLabel ? `label="${this.label}"` : ''}
    />`
  }
}
