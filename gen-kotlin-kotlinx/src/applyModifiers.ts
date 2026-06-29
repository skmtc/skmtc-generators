import type { Modifiers } from '@skmtc/core'

/**
 * Kotlin's modifier application: nullability is a `?` suffix on the type
 * expression. A type is nullable when the schema says so (`nullable`) OR
 * when the property is optional (absent fields decode as `null`; the
 * parameter additionally gets a `= null` default, applied at the
 * parameter layer in `KtDataClassValue`).
 *
 * The type expression is the SINGLE owner of the `?` — `KtParameterList`
 * never adds one on top (no `String??`).
 */
export const applyModifiers = (content: string, modifiers: Modifiers): string => {
  const nullable = modifiers.nullable === true || modifiers.required === false

  return nullable && !content.endsWith('?') ? `${content}?` : content
}
