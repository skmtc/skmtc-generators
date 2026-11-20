import { DanglingRefError } from '@skmtc/core'

/**
 * Resolve a reference, or `undefined` when it names nothing in the document.
 * The parser keeps such a `$ref` only when `system.danglingRefs` lists its
 * kind, and the docs then mark it with an `UnresolvedMarker` instead of
 * failing the whole document. Any other error throws.
 */
export const safeResolve = <T>(ref: { resolve: () => T }): T | undefined => {
  try {
    return ref.resolve()
  } catch (error) {
    if (DanglingRefError.is(error)) {
      return undefined
    }

    throw error
  }
}
