import { TypescriptSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, OasRef, OasSchema } from '@skmtc/core'
import { labelText } from './labelText.ts'

/**
 * HTML input types we discriminate between for string fields. Maps
 * directly onto the `type` attribute the underlying `<input>` carries —
 * affects mobile keyboard, browser-native validation, and the date
 * picker behavior. Adding a new type here only requires extending the
 * union; the StringField widget on the consumer side forwards `type`
 * verbatim.
 */
export type StringInputType = 'text' | 'email' | 'tel' | 'date'

export type StringInputArgs = {
  /** Originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  /** Lens path expressed as dotted property names, e.g. `input.title`. */
  path: string
  label: string | undefined
  isRequired: boolean
  destinationPath: string
  /** Defaults to 'text' if omitted. */
  inputType?: StringInputType
}

/** Single-line text. Emits `<StringField lens={lens.focus(path)} />`. */
export class StringInput extends TypescriptSnippet {
  readonly path: string
  readonly label: string | undefined
  readonly isRequired: boolean
  readonly inputType: StringInputType

  constructor({ context, path, label, isRequired, destinationPath, inputType = 'text', schema }: StringInputArgs) {
    super({ context, schema })
    this.path = path
    this.label = label
    this.isRequired = isRequired
    this.inputType = inputType

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
    const label = labelText(this.label, this.isRequired)
    return `<StringField lens={lens.focus('${this.path}').defined()}${
      this.inputType !== 'text' ? ` type="${this.inputType}"` : ''
    }${label ? ` label="${label}"` : ''} />`
  }
}
