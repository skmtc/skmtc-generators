import { toJsonContent } from '@skmtc/core'
import type { OasSchema, OasRef, OasMediaType } from '@skmtc/core'

type Content = {
  /** The media types worth listing: none for no content, or for the plain single `application/json`. */
  listedMediaTypes: string[]
  schema: OasSchema | OasRef<'schema'> | undefined
}

/**
 * The media types a request body, response or parameter offers, plus a
 * representative schema — the one `toJsonContent` picks (`application/json`,
 * else the first JSON-like type, else a JSON-shaped `*\/*`), else the first
 * media type's. Surfacing the media type tells an agent what to send or accept
 * (form uploads, binary, custom types); the schema still renders once (rare
 * per-media-type schema divergence is not expanded).
 */
export const toContent = (content: Record<string, OasMediaType> | undefined): Content => {
  const mediaTypes = Object.keys(content ?? {})
  const first = mediaTypes[0]
  const schema =
    toJsonContent(content)?.schema ??
    (first !== undefined ? content?.[first]?.schema : undefined)
  const plainJson = mediaTypes.length === 1 && first === 'application/json'

  return { listedMediaTypes: plainJson ? [] : mediaTypes, schema }
}
