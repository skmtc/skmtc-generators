import type { Stringable, Modifiers } from '@skmtc/core'

export const withNullable = (value: Stringable, { nullable }: Modifiers): string => {
  return nullable ? `${value}.nullable()` : `${value}`
}
