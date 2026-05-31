import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType, OasRef, OasSchema } from '@skmtc/core'

export type CheckboxInputArgs = {
  /** Originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  path: string
  label: string | undefined
  destinationPath: string
}

/** Boolean checkbox. Emits `<CheckboxField lens={lens.focus(path)} />`. */
export class CheckboxInput extends SnippetBase {
  readonly path: string
  readonly label: string | undefined

  constructor({ context, path, label, destinationPath, schema }: CheckboxInputArgs) {
    super({ context, schema })
    this.path = path
    this.label = label

    this.register({
      destinationPath,
      imports: { '@/forms/fields': ['CheckboxField'] }
    })
  }

  override toString(): string {
    return `<CheckboxField lens={lens.focus('${this.path}').defined()}${
      this.label ? ` label="${this.label}"` : ''
    } />`
  }
}
