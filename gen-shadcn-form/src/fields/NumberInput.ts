import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType, OasRef, OasSchema } from '@skmtc/core'

type NumberInputArgs = {
  context: GenerateContextType
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  destinationPath: string
  /** The originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class NumberInput extends SnippetBase {
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean

  constructor(
    { context, name, label, placeholder, destinationPath, skipLabel, schema }: NumberInputArgs
  ) {
    super({ context, schema })

    this.name = name
    this.label = label
    this.placeholder = placeholder
    this.skipLabel = skipLabel
    this.register({
      imports: { '@/components/fields/number-field': ['NumberField'] },
      destinationPath
    })
  }

  override toString() {
    return `<NumberField 
      ${this.name ? `lens={lens.focus(\`${this.name}\`).defined()}` : 'lens={lens}'}
      ${this.label && !this.skipLabel ? `label="${this.label}"` : ''}
    />`
  }
}
