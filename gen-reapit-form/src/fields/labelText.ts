/**
 * Format a field label for required/optional display.
 *
 * Currently appends ` *` for required fields and leaves optional ones
 * unchanged. Centralized so every field component renders the same
 * required convention — switching to a different glyph (e.g. an
 * `<InputError>`-style icon) means changing this one function.
 */
export const labelText = (
  label: string | undefined,
  isRequired: boolean
): string | undefined => {
  if (!label) return label
  return isRequired ? `${label} *` : label
}
