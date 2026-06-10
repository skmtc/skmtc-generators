import type { GenerateContextType, OasRef, OasSchema } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'

type IntegerInputArgs = {
  context: GenerateContextType
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  destinationPath: string
  /** The originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class IntegerInput extends TsSnippet {
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean

  constructor(
    { context, name, label, placeholder, destinationPath, skipLabel, schema }: IntegerInputArgs
  ) {
    super({ context, stackTrail: schema?.stackTrail.clone() })

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
