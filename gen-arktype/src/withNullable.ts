import type { Modifiers, Stringable } from '@skmtc/core'

/** String syntax — `string` becomes `string | null`. */
export const withNullable = (stringSyntax: string, { nullable }: Modifiers): string =>
  nullable ? `${stringSyntax} | null` : stringSyntax

/**
 * Value syntax — `{ a: "string" }` becomes `[{ a: "string" }, "|", "null"]`.
 *
 * Arktype's union tuple is strictly binary: `[a, "|", b, "|", "null"]` parses
 * as `a | b` and silently drops the rest, so a further modifier must nest
 * around this result rather than extend it.
 */
export const withNullableValue = (value: Stringable, { nullable }: Modifiers): string =>
  nullable ? `[${value}, "|", "null"]` : `${value}`
