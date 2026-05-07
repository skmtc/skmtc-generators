import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

export type StringInputArgs = {
  context: GenerateContextType
  /** Lens path expressed as dotted property names, e.g. `input.title`. */
  path: string
  label: string | undefined
  isRequired: boolean
  destinationPath: string
}

/** Single-line text. Emits `<StringField lens={lens.focus(path)} />`. */
export class StringInput extends SnippetBase {
  readonly path: string
  readonly label: string | undefined
  readonly isRequired: boolean

  constructor({ context, path, label, isRequired, destinationPath }: StringInputArgs) {
    super({ context })
    this.path = path
    this.label = label
    this.isRequired = isRequired

    this.register({
      destinationPath,
      imports: { '@/forms/fields': ['StringField'] }
    })
  }

  // `defined()` narrows the lens to NonNullable<T>. Field components are
  // typed against `Lens<string>` (no null/undefined), so optional fields'
  // null-and-undefined-permitting lens is widened to a string lens at the
  // call site. Empty-string-to-null coercion happens in the form's
  // submit handler instead.
  override toString(): string {
    return `<StringField lens={lens.focus('${this.path}').defined()}${
      this.label ? ` label="${this.label}"` : ''
    } />`
  }
}
