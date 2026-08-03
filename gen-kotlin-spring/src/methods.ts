import { capitalize } from '@skmtc/core'
import type { Method } from '@skmtc/core'

/**
 * The HTTP methods this generator claims — the ones Spring gives a
 * shorthand mapping annotation. Anything else (`head`, `options`,
 * `trace`) is filtered out by the entry, so no artifact is produced.
 */
export type SupportedMethod = 'get' | 'post' | 'put' | 'delete' | 'patch'

/**
 * A leaf module: read by `base.ts`'s `isSupported`, by the entry, and by
 * the handler snippet, none of which may close a load-time cycle.
 *
 * Narrowed by an exhaustive switch rather than a membership test on a
 * widened array — generator code narrows, it does not assert.
 */
export const isSupportedMethod = (method: Method): method is SupportedMethod => {
  switch (method) {
    case 'get':
    case 'post':
    case 'put':
    case 'delete':
    case 'patch':
      return true
    default:
      return false
  }
}

/**
 * The Spring shorthand mapping annotation for a method — `get` →
 * `GetMapping`. Only reachable for a supported method; the entry's
 * `isSupported` is what guarantees that.
 */
export const toMappingAnnotationName = (method: SupportedMethod): string => {
  return `${capitalize(method)}Mapping`
}
