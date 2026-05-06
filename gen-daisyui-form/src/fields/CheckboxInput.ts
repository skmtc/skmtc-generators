import { ContentBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

type CheckboxInputArgs = {
  context: GenerateContextType
  name: string
  label: string | undefined
  skipLabel?: boolean
  destinationPath: string
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error'
}

export class CheckboxInput extends ContentBase {
  name: string
  label: string | undefined
  skipLabel?: boolean
  color?: string

  constructor({ context, name, label, skipLabel, color }: CheckboxInputArgs) {
    super({ context })

    this.name = name
    this.label = label ?? name
    this.skipLabel = skipLabel
    this.color = color
  }

  override toString() {
    const colorMod = this.color ? ` checkbox-${this.color}` : ''

    return `<Controller {...lens.focus(\`${this.name}\`).interop()} render={({ field, fieldState }) => (
  <div className="form-control w-full">
    <label className="label cursor-pointer justify-start gap-3">
      <input
        type="checkbox"
        className="checkbox${colorMod}"
        checked={Boolean(field.value)}
        onChange={(e) => field.onChange(e.target.checked)}
        onBlur={field.onBlur}
        ref={field.ref}
        name={field.name}
      />
      ${this.skipLabel ? '' : `<span className="label-text">${this.label}</span>`}
    </label>
    {fieldState.error ? <div className="label"><span className="label-text-alt text-error">{fieldState.error.message}</span></div> : null}
  </div>
)} />`
  }
}
