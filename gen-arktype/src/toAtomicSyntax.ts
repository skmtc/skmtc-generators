/**
 * Parenthesises string syntax that a suffix would otherwise bind wrong:
 * `string | null` becomes `(string | null)` so that `[]` applies to the union
 * rather than to its last member.
 *
 * Values expose the result as `atomicStringSyntax` alongside `stringSyntax` —
 * a parent reads whichever field its position needs, and never inspects the
 * child to work it out.
 */
export const toAtomicSyntax = (stringSyntax: string): string =>
  stringSyntax.includes(' | ') ? `(${stringSyntax})` : stringSyntax
