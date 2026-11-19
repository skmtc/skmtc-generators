import type { SystemSettings } from '@skmtc/core'

/**
 * The `system` settings the docs run with: every kind of `$ref` may name
 * nothing, so the parser keeps what holds one and the docs mark it, as the
 * hub's docs pages do (skmtc/skmtc-hub#3493). `allOfMember` stays out: an
 * `allOf` with a missing member is removed.
 */
export const docsSystem: SystemSettings = {
  danglingRefs: ['schema', 'parameter', 'requestBody', 'response', 'header', 'securityScheme', 'example', 'link']
}
