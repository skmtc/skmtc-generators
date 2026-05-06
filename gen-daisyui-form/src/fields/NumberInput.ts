import { ContentBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

type NumberInputArgs = {
  context: GenerateContextType
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  destinationPath: string
  step?: 'any' | string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

export class NumberInput extends ContentBase {
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  step: string
  size?: 'xs' | 'sm' | 'md' | 'lg'

  constructor({
    context,
    name,
    label,
    placeholder,
    skipLabel,
    step,
    size
  }: NumberInputArgs) {
    super({ context })

    this.name = name
    this.label = label ?? name
    this.placeholder = placeholder
    this.skipLabel = skipLabel
    this.step = step ?? 'any'
    this.size = size
  }

  override toString() {
    const sizeMod = this.size ? ` input-${this.size}` : ''
    const placeholder = this.placeholder ? ` placeholder="${this.placeholder}"` : ''

    return `<Controller {...lens.focus(\`${this.name}\`).interop()} render={({ field, fieldState }) => (
  <label className="form-control w-full">
    ${this.skipLabel ? '' : `<div className="label"><span className="label-text">${this.label}</span></div>`}
    <input
      type="number"
      step="${this.step}"
      className="input input-bordered w-full${sizeMod}"${placeholder}
      value={field.value ?? ''}
      onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      onBlur={field.onBlur}
      ref={field.ref}
      name={field.name}
    />
    {fieldState.error ? <div className="label"><span className="label-text-alt text-error">{fieldState.error.message}</span></div> : null}
  </label>
)} />`
  }
}
