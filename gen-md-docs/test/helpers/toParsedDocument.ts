import { ParseContext, StackTrail, type SkmtcParsedDocument } from '@skmtc/core'
import type { OpenAPIV3 } from 'openapi-types'
import * as log from 'jsr:@std/log@0.224/logger'

/**
 * Parse a raw OpenAPI document through `ParseContext` into a resolved
 * `SkmtcParsedDocument` — for tests that need real, resolvable `$ref`s (the
 * empty-document `toGenerateContext` can't resolve one).
 *
 * `document` is typed as an `OpenAPIV3.Document`, so a malformed fixture is a
 * compile error. It is round-tripped through JSON only to reach the parse
 * input's `OpenAPIV3.Document<Record<string, never>>` type, which no object
 * literal satisfies — core's own bench parses raw docs the same way.
 */
export const toParsedDocument = (document: OpenAPIV3.Document): SkmtcParsedDocument => {
  const parseContext = new ParseContext({
    input: { type: 'oas', value: JSON.parse(JSON.stringify(document)) },
    logger: new log.Logger('test', 'ERROR'),
    silent: true
  })

  return parseContext.parse(new StackTrail(['root']))
}
