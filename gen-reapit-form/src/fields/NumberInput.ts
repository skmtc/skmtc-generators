import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType, OasRef, OasSchema } from '@skmtc/core'
import { labelText } from './labelText.ts'

export type NumberInputArgs = {
  /** Originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  path: string
  label: string | undefined
  isRequired: boolean
  destinationPath: string
}

/** Numeric input. Emits `<NumberField lens={lens.focus(path)} />`. */
export class NumberInput extends SnippetBase {
  readonly path: string
  readonly label: string | undefined
  readonly isRequired: boolean

  constructor({ context, path, label, isRequired, destinationPath, schema }: NumberInputArgs) {
    super({ context, schema })
    this.path = path
    this.label = label
    this.isRequired = isRequired

    this.register({
      destinationPath,
      imports: { '@/forms/fields': ['NumberField'] }
    })
  }

  override toString(): string {
    const label = labelText(this.label, this.isRequired)
    return `<NumberField lens={lens.focus('${this.path}').defined()}${
      label ? ` label="${label}"` : ''
    } />`
  }
}
