import { DanglingRefError } from '@skmtc/core'

/**
 * What the docs write after the type, parameter `$ref`, status code or name
 * of something whose `$ref` names nothing: the same marker as the hub's
 * Markdown docs.
 */
export const UNRESOLVED_REF = ' (unresolved $ref)'

/**
 * Resolve a reference, or `undefined` when it names nothing in the document.
 * The parser keeps such a `$ref` only when `system.danglingRefs` lists its
 * kind, and the docs then mark it with {@link UNRESOLVED_REF} instead of
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
