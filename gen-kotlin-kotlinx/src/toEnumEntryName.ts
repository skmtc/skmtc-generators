/**
 * Derives a Kotlin enum entry name from a wire value: CONSTANT_CASE with
 * camel boundaries preserved (`inProgress` → `IN_PROGRESS`), non-name
 * characters collapsed to `_`, a leading digit prefixed with `_`, and the
 * empty residue pinned to `EMPTY`. When the result differs from the wire
 * value the entry gets a `@SerialName` annotation (kotlinx serializes
 * enum entries by name).
 */
/**
 * Collapse the parser's `string[] | (string | null)[]` enum shape to the
 * non-null wire values (nullability is the type expression's `?`, not an
 * entry).
 */
export const toEnumValues = (enums: string[] | (string | null)[] | undefined): string[] => {
  const values: string[] = []

  for (const value of enums ?? []) {
    if (value !== null) {
      values.push(value)
    }
  }

  return values
}

export const toEnumEntryName = (value: string): string => {
  const constantCase = value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!constantCase) {
    return 'EMPTY'
  }

  return /^[0-9]/.test(constantCase) ? `_${constantCase}` : constantCase
}
