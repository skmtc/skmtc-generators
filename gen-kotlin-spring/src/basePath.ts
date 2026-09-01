import type { GenerateContextType } from '@skmtc/core'

/**
 * The path the document's server URL carries, prefixed onto every route.
 *
 * OpenAPI paths are relative to the server URL, so a document served at
 * `https://api.example.com/v2` and declaring `/users` describes
 * `/v2/users`. Reading only the paths map drops that segment and every
 * generated route is short by it.
 *
 * Decisions this makes, none of which the document settles:
 *
 * - The FIRST server, matching how a multi-tag operation joins its first
 *   tag. A document offering several servers with different paths has no
 *   single answer, and picking one is better than emitting none.
 * - Server variables resolve to their declared defaults, which is what the
 *   `default` field is for. A variable in the PATH portion is rare; a
 *   variable in the host is common and does not affect the result.
 * - A path-item or operation `servers` override is ignored, including the
 *   empty arrays some documents carry. Spring's mapping is per controller,
 *   so a per-operation base path cannot be expressed without moving the
 *   prefix onto every method, and an empty array overriding the root would
 *   mean "no server", which describes nothing.
 */
export const toBasePath = (context: GenerateContextType): string => {
  if (context.document.type !== 'oas') {
    return ''
  }

  const server = context.document.value.servers?.[0]

  if (!server) {
    return ''
  }

  const resolved = Object.entries(server.variables ?? {}).reduce(
    (url, [name, variable]) => url.replaceAll(`{${name}}`, variable.default),
    server.url
  )

  // A relative URL is all path; an absolute one contributes only its path.
  // `URL` needs a base for the relative case and discards it for the other.
  const path = URL.canParse(resolved)
    ? new URL(resolved).pathname
    : new URL(resolved, 'https://basePath.invalid').pathname

  const trimmed = path.replace(/\/+$/, '')

  return trimmed === '/' ? '' : trimmed
}
