import type { GenerateContextType, OasRef, OasSchema } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'

type IntegerInputArgs = {
  context: GenerateContextType
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  destinationPath: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** The originating property schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class IntegerInput extends TsSnippet {
  name: string
  label: string | undefined
  placeholder?: string
  skipLabel?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'

  constructor({ context, name, label, placeholder, skipLabel, size, schema }: IntegerInputArgs) {
    super({ context, stackTrail: schema?.stackTrail.clone() })

    this.name = name
    this.label = label ?? name
    this.placeholder = placeholder
    this.skipLabel = skipLabel
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
      step="1"
      className="input input-bordered w-full${sizeMod}"${placeholder}
      value={field.value ?? ''}
      onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number.parseInt(e.target.value, 10))}
      onBlur={field.onBlur}
      ref={field.ref}
      name={field.name}
    />
    {fieldState.error ? <div className="label"><span className="label-text-alt text-error">{fieldState.error.message}</span></div> : null}
  </label>
)} />`
  }
}
