import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType, OasRef, OasSchema } from '@skmtc/core'
import { labelText } from './labelText.ts'

export type TextAreaInputArgs = {
  /** Originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  path: string
  label: string | undefined
  isRequired: boolean
  destinationPath: string
}

/** Multi-line text. Emits `<TextAreaField lens={lens.focus(path)} />`. */
export class TextAreaInput extends SnippetBase {
  readonly path: string
  readonly label: string | undefined
  readonly isRequired: boolean

  constructor({ context, path, label, isRequired, destinationPath, schema }: TextAreaInputArgs) {
    super({ context, schema })
    this.path = path
    this.label = label
    this.isRequired = isRequired

    this.register({
      destinationPath,
      imports: { '@/forms/fields': ['TextAreaField'] }
    })
  }

  override toString(): string {
    const label = labelText(this.label, this.isRequired)
    return `<TextAreaField lens={lens.focus('${this.path}').defined()}${
      label ? ` label="${label}"` : ''
    } />`
  }
}
