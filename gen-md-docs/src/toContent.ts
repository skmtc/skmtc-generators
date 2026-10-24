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

type MediaTypesArgs = {
  context: GenerateContextType
  mediaTypes: string[]
}

/**
 * The content-type annotation, e.g. ``Content types: `text/csv`, `application/json` ``.
 * Nothing for no media types or the plain single `application/json`.
 */
export class MediaTypes extends SnippetBase {
  content: Maybe<boolean, Wrap>

  constructor({ context, mediaTypes }: MediaTypesArgs) {
    super({ context })

    const plain =
      mediaTypes.length === 0 || (mediaTypes.length === 1 && mediaTypes[0] === 'application/json')

    this.content = new Maybe(
      !plain,
      () =>
        new Wrap([
          mediaTypes.length === 1 ? 'Content type: ' : 'Content types: ',
          new Loop(mediaTypes.map(type => new Wrap(['`', type, '`'])))
        ])
    )
  }

  override toString(): string {
    return `${this.content}`
  }
}
