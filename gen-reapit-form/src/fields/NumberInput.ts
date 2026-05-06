import { ContentBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

export type NumberInputArgs = {
  context: GenerateContextType
  path: string
  label: string | undefined
  isRequired: boolean
  destinationPath: string
}

/** Numeric input. Emits `<NumberField lens={lens.focus(path)} />`. */
export class NumberInput extends ContentBase {
  readonly path: string
  readonly label: string | undefined
  readonly isRequired: boolean

  constructor({ context, path, label, isRequired, destinationPath }: NumberInputArgs) {
    super({ context })
    this.path = path
    this.label = label
    this.isRequired = isRequired

    this.register({
      destinationPath,
      imports: { '@/forms/fields': ['NumberField'] }
    })
  }

  override toString(): string {
    return `<NumberField lens={lens.focus('${this.path}').defined()}${
      this.label ? ` label="${this.label}"` : ''
    } />`
  }
}
