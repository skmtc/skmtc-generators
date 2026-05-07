import { SnippetBase, List } from '@skmtc/core'
import type { GenerateContextType, ListLines, Stringable } from '@skmtc/core'

type SelectInputArgs = {
  context: GenerateContextType
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  destinationPath: string
  enums: string[]
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

export class SelectInput extends SnippetBase {
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
    size
  }: SelectInputArgs) {
    super({ context })

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
