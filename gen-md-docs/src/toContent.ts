import {
  SnippetBase,
  type GenerateContextType,
  type OasSchema,
  type OasRef,
  type OasMediaType
} from '@skmtc/core'
import { Loop, Maybe, Wrap } from './Maybe.ts'

type Content = {
  mediaTypes: string[]
  /** The media types worth annotating: none for no media types or the plain single `application/json`. */
  listedMediaTypes: string[]
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

  const plain =
    mediaTypes.length === 0 || (mediaTypes.length === 1 && mediaTypes[0] === 'application/json')

  return { mediaTypes, listedMediaTypes: plain ? [] : mediaTypes, schema }
}

type MediaTypesArgs = {
  context: GenerateContextType
  mediaTypes: readonly string[]
}

/**
 * The content-type annotation, e.g. ``Content types: `text/csv`, `application/json` ``.
 * Always renders: a parent builds it through
 * `Maybe.nonEmpty(content.listedMediaTypes, types => new MediaTypes(…))`, which is
 * empty for no media types or the plain single `application/json`.
 */
export class MediaTypes extends SnippetBase {
  annotation: Wrap

  constructor({ context, mediaTypes }: MediaTypesArgs) {
    super({ context })

    this.annotation = new Wrap([
      Maybe.when(
        mediaTypes.length === 1,
        () => 'Content type: ',
        () => 'Content types: '
      ),
      new Loop(mediaTypes.map(type => new Wrap(['`', type, '`'])))
    ])
  }

  override toString(): string {
    return `${this.annotation}`
  }
}
