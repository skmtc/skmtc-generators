/**
 * Resolve a `$ref` (schema or response), returning `undefined` when it can't be
 * resolved — a dangling target, a type mismatch, or a chain past the lookup
 * limit — instead of throwing. One bad ref then degrades to a plain name rather
 * than failing the whole document. Such refs are already recorded as parse
 * issues, so this is graceful degradation, not silent data loss.
 */
export const safeResolve = <T>(ref: { resolve: () => T }): T | undefined => {
  try {
    return ref.resolve()
  } catch {
    return undefined
  }
}
