import type { GenerateContextType, OasRef, OasSchema, Stringable } from '@skmtc/core'
import { TsSnippet, List, type ListLines } from '@skmtc/lang-typescript'

type SelectInputArgs = {
  context: GenerateContextType
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  destinationPath: string
  enums: string[]
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** The originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class SelectInput extends TsSnippet {
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  options: ListLines<Stringable>
  size?: 'xs' | 'sm' | 'md' | 'lg'

  constructor({
    context,
    name,
    label,
    placeholder,
    skipLabel,
    enums,
    size,
    schema
  }: SelectInputArgs) {
    super({ context, stackTrail: schema?.stackTrail.clone() })

    this.name = name
    this.label = label ?? name
    this.placeholder = placeholder ?? 'Select…'
    this.skipLabel = skipLabel
    this.size = size
    this.options = List.toLines(
      enums.map(value => `<option value="${value}">${value}</option>`)
    )
  }

  override toString() {
    const sizeMod = this.size ? ` select-${this.size}` : ''

    return `<Controller {...lens.focus(\`${this.name}\`).interop()} render={({ field, fieldState }) => (
  <label className="form-control w-full">
    ${this.skipLabel ? '' : `<div className="label"><span className="label-text">${this.label}</span></div>`}
    <select
      {...field}
      value={field.value ?? ''}
      className="select select-bordered w-full${sizeMod}"
    >
      <option value="" disabled>${this.placeholder}</option>
      ${this.options}
    </select>
    {fieldState.error ? <div className="label"><span className="label-text-alt text-error">{fieldState.error.message}</span></div> : null}
  </label>
)} />`
  }
}
