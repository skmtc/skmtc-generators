import { ContentBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

type NumberInputArgs = {
  context: GenerateContextType
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  destinationPath: string
}

export class NumberInput extends ContentBase {
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean

  constructor({ context, name, label, placeholder, destinationPath, skipLabel }: NumberInputArgs) {
    super({ context })

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
