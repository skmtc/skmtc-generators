/**
 * A number or integer enum as valibot literals. A `null` among the values
 * comes with `nullable`, which `applyModifiers` renders. An empty
 * `enum: []` accepts nothing.
 *
 * Narrower than `v.number()` on purpose: gen-typescript types an integer
 * enum as its literals (`25 | 50 | 100`), and a recursive model's
 * `v.GenericSchema<T>` annotation checks this schema against that type.
 */
export const toNumberEnum = (enums: readonly (number | null)[]): string => {
  const values = enums.filter((value): value is number => value !== null)

  if (values.length === 0) {
    return enums.includes(null) ? 'v.null()' : 'v.never()'
  }

  return values.length === 1 ? `v.literal(${values[0]})` : `v.picklist([${values.join(', ')}])`
}
