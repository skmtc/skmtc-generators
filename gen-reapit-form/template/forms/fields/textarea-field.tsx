import { useController } from 'react-hook-form'
import type { Lens } from '@hookform/lenses'
import { Label, TextArea } from '@reapit/elements'

export type TextAreaFieldProps = {
  lens: Lens<string>
  label?: string
}

export function TextAreaField({ lens, label }: TextAreaFieldProps) {
  const { field, fieldState } = useController(lens.interop())
  return (
    <div>
      {label && <Label>{label}</Label>}
      <TextArea {...field} value={field.value ?? ''} hasError={fieldState.invalid} />
    </div>
  )
}
