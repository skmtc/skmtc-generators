/**
 * A pattern as the body of a TypeScript regex literal: every forward slash
 * that could end the literal — unescaped, and outside a character class —
 * is escaped, and nothing else is touched. An already-escaped `\/` stays
 * `\/`: doubling it (`\\/`) is a backslash followed by an unescaped slash,
 * which ends the literal early.
 */
export const toRegexSource = (pattern: string): string => {
  let out = ''
  let inClass = false
  let escaped = false

  for (const char of pattern) {
    if (escaped) {
      escaped = false
    } else if (char === '\\') {
      escaped = true
    } else if (char === '[') {
      inClass = true
    } else if (char === ']') {
      inClass = false
    } else if (char === '/' && !inClass) {
      out += '\\'
    }

    out += char
  }

  return out
}
