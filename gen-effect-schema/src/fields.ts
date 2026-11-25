import type { EffectModifiers } from './modifiers.ts'

/**
 * Whether a value renders a schema with `.fields`: a `Schema.Struct`, or a
 * reference to a model that is one. `Schema.suspend`, `Schema.NullOr`,
 * `Schema.StructWithRest` and a schema piped into a default have none.
 */
export const hasFields = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && 'fieldsKnown' in value &&
  value.fieldsKnown === true

/** Whether `applyModifiers` adds nothing that hides `.fields`. */
export const isBare = ({ required, nullable, defaultValue }: EffectModifiers): boolean =>
  required === true && !nullable && defaultValue === undefined
