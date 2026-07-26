import type { Modifiers, Stringable } from '@skmtc/core'

/** String syntax — `string` becomes `string | undefined`. */
export const withOptional = (stringSyntax: string, { required }: Modifiers): string =>
  required ? stringSyntax : `${stringSyntax} | undefined`

/** Value syntax — see the nesting note on {@link withNullableValue}. */
export const withOptionalValue = (value: Stringable, { required }: Modifiers): string =>
  required ? `${value}` : `[${value}, "|", "undefined"]`
