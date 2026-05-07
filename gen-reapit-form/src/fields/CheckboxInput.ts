import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

export type CheckboxInputArgs = {
  context: GenerateContextType
  path: string
  label: string | undefined
  destinationPath: string
}

/** Boolean checkbox. Emits `<CheckboxField lens={lens.focus(path)} />`. */
export class CheckboxInput extends SnippetBase {
  readonly path: string
  readonly label: string | undefined

  constructor({ context, path, label, destinationPath }: CheckboxInputArgs) {
    super({ context })
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
