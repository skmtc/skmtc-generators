/**
 * Collapse the parser's `string[] | (string | null)[]` enum shape to the
 * non-null wire values (nullability is the type expression's `?`, not a
 * member). Member NAMING lives in `@skmtc/lang-csharp`
 * (`toCsEnumMemberNames` — PascalCase + full-produced-set dedup).
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
