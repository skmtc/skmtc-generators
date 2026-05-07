import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

type IntegerInputArgs = {
  context: GenerateContextType
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  destinationPath: string
}

export class IntegerInput extends SnippetBase {
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean

  constructor({ context, name, label, placeholder, destinationPath, skipLabel }: IntegerInputArgs) {
    super({ context })

    this.name = name
    this.label = label ?? name
    this.placeholder = placeholder
    this.skipLabel = skipLabel

    this.register({
      imports: { '@/components/fields/integer-field': ['IntegerField'] },
      destinationPath
    })
  }

  override toString() {
    return `<IntegerField
      ${this.name ? `lens={lens.focus(\`${this.name}\`).defined()}` : 'lens={lens}'}
      ${this.label && !this.skipLabel ? `label="${this.label}"` : ''}
    />`
  }
}
