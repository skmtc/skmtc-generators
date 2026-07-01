import type { OasSchema, OasRef, OasMediaType } from '@skmtc/core'

type Content = {
  mediaTypes: string[]
  schema: OasSchema | OasRef<'schema'> | undefined
}

/**
 * The media types a request body or response offers, plus a representative
 * schema — JSON-preferred, else the first media type's. Surfacing the media
 * type tells an agent what to send or accept (form uploads, binary, custom
 * types); the schema still renders once (rare per-media-type schema divergence
 * is not expanded).
 */
export const toContent = (content: Record<string, OasMediaType> | undefined): Content => {
  const mediaTypes = Object.keys(content ?? {})
  const first = mediaTypes[0]
  const schema =
    content?.['application/json']?.schema ??
    (first !== undefined ? content?.[first]?.schema : undefined)

  return { mediaTypes, schema }
}

/** The content-type annotation, or `undefined` for the plain single `application/json`. */
export const toMediaTypeLine = (mediaTypes: string[]): string | undefined => {
  if (mediaTypes.length === 0 || (mediaTypes.length === 1 && mediaTypes[0] === 'application/json')) {
    return undefined
  }

  const label = mediaTypes.length === 1 ? 'Content type' : 'Content types'

  return `${label}: ${mediaTypes.map(type => `\`${type}\``).join(', ')}`
}
