import { useController } from 'react-hook-form'
import type { Lens } from '@hookform/lenses'
import { InputGroup } from '@reapit/elements'

export type StringFieldProps = {
  lens: Lens<string>
  label?: string
  placeholder?: string
}

export function StringField({ lens, label, placeholder }: StringFieldProps) {
  const { field, fieldState } = useController(lens.interop())
  return (
    <InputGroup
      {...field}
      type="text"
      label={label}
      placeholder={placeholder}
      // RHF stores undefined until the user types; `defined()` is a
      // type-level assertion only, so we still coalesce at runtime.
      value={field.value ?? ''}
      hasError={fieldState.invalid}
      errorMessage={fieldState.error?.message}
    />
  )
}
