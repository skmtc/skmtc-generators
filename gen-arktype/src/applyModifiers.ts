import type { Modifiers, Stringable } from '@skmtc/core'
import { withNullable, withNullableValue } from './withNullable.ts'
import { withOptional, withOptionalValue } from './withOptional.ts'

/**
 * Applies modifiers to a value's arktype **string syntax** — the spelling
 * scalars, and arrays/unions built only from scalars, can use.
 */
export const applyModifiers = (stringSyntax: string, modifiers: Modifiers): string =>
  withOptional(withNullable(stringSyntax, modifiers), modifiers)

/**
 * Applies modifiers to a value's **definition value** — the spelling objects,
 * refs, and anything containing one must use, because arktype's string syntax
 * has neither object literals nor name resolution.
 */
export const applyValueModifiers = (value: Stringable, modifiers: Modifiers): string =>
  withOptionalValue(withNullableValue(value, modifiers), modifiers)
