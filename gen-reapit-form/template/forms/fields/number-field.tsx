import { useController } from 'react-hook-form'
import type { Lens } from '@hookform/lenses'
import { InputGroup } from '@reapit/elements'

export type NumberFieldProps = {
  lens: Lens<number>
  label?: string
}

export function NumberField({ lens, label }: NumberFieldProps) {
  const { field, fieldState } = useController(lens.interop())
  return (
    <InputGroup
      {...field}
      type="number"
      label={label}
      value={field.value ?? ''}
      onChange={event =>
        field.onChange(event.target.value === '' ? undefined : Number(event.target.value))
      }
      hasError={fieldState.invalid}
      errorMessage={fieldState.error?.message}
    />
  )
}
