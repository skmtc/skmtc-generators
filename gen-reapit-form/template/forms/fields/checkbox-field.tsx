import { useController } from 'react-hook-form'
import type { Lens } from '@hookform/lenses'
import { Input, Label } from '@reapit/elements'

export type CheckboxFieldProps = {
  lens: Lens<boolean>
  label: string
}

// v4 has no dedicated checkbox component; use a native `<Input type="checkbox">`
// alongside a `<Label>`. Layout is intentionally minimal — own this file.
export function CheckboxField({ lens, label }: CheckboxFieldProps) {
  const { field } = useController(lens.interop())
  return (
    <Label>
      <Input
        {...field}
        type="checkbox"
        checked={field.value ?? false}
        value={undefined}
        onChange={event => field.onChange(event.target.checked)}
      />
      {label}
    </Label>
  )
}
