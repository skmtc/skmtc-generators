import type { GenerateContextType, OasRef, OasSchema } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'

type StringInputArgs = {
  context: GenerateContextType
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  destinationPath: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  multiline?: boolean
  /** The originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class StringInput extends TsSnippet {
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  multiline?: boolean

  constructor({
    context,
    name,
    label,
    placeholder,
    skipLabel,
    size,
    multiline,
    schema
  }: StringInputArgs) {
    super({ context, stackTrail: schema?.stackTrail.clone() })

    this.name = name
    this.label = label ?? name
    this.placeholder = placeholder
    this.skipLabel = skipLabel
    this.size = size
    this.multiline = multiline
  }

  override toString() {
    const sizeMod = this.size ? ` ${this.multiline ? 'textarea' : 'input'}-${this.size}` : ''
    const baseClass = this.multiline
      ? `textarea textarea-bordered w-full${sizeMod}`
      : `input input-bordered w-full${sizeMod}`
    const placeholder = this.placeholder ? ` placeholder="${this.placeholder}"` : ''

    const inputEl = this.multiline
      ? `<textarea {...field} className="${baseClass}"${placeholder} />`
      : `<input type="text" {...field} className="${baseClass}"${placeholder} />`

    return `<Controller {...lens.focus(\`${this.name}\`).interop()} render={({ field, fieldState }) => (
  <label className="form-control w-full">
    ${this.skipLabel ? '' : `<div className="label"><span className="label-text">${this.label}</span></div>`}
    ${inputEl}
    {fieldState.error ? <div className="label"><span className="label-text-alt text-error">{fieldState.error.message}</span></div> : null}
  </label>
)} />`
  }
}
