import { useController } from 'react-hook-form'
import type { Lens } from '@hookform/lenses'
import { Label, Select } from '@reapit/elements'
import type { ReactNode } from 'react'

export type RawSelectFieldProps = {
  lens: Lens<string>
  label?: string
  /** `<option>` elements; the consumer picks them or the generator emits them inline. */
  children: ReactNode
}

// Generic select for arbitrary string-valued options. For schema-typed
// enum selects, prefer the `<EnumName>SelectField` components emitted
// by `@skmtc/gen-reapit-enum-select`, which carry the enum's value
// type in their lens prop.
export function RawSelectField({ lens, label, children }: RawSelectFieldProps) {
  const { field } = useController(lens.interop())
  return (
    <div>
      {label && <Label>{label}</Label>}
      <Select {...field} value={field.value ?? ''}>
        <option value="">--</option>
        {children}
      </Select>
    </div>
  )
}
