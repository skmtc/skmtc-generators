import type { Modifiers } from '@skmtc/core'

/**
 * C#'s modifier application: nullability is a `?` suffix on the type
 * expression — uniform over reference types (annotation) and value types
 * (`Nullable<T>`), D4. A type is nullable when the schema says so
 * (`nullable`) OR when the property is optional (absent fields
 * deserialize as `null`; the optional property additionally gets
 * `[JsonIgnore(WhenWritingNull)]`, applied at the property layer in
 * `CsRecordValue` — A1).
 *
 * The type expression is the SINGLE owner of the `?` — `CsPropertyList`
 * never adds one on top (no `string??`).
 */
export const applyModifiers = (content: string, modifiers: Modifiers): string => {
  const nullable = modifiers.nullable === true || modifiers.required === false

  return nullable && !content.endsWith('?') ? `${content}?` : content
}
