import { SnippetBase, type GenerateContextType } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { InlineCode } from './InlineCode.ts'

type MediaTypesArgs = {
  context: GenerateContextType
  /** The media types to list: at least one. */
  mediaTypes: string[]
}

/**
 * The media types a body, response or parameter offers, so an agent knows what
 * to send or accept: ``Content types: `application/json`, `application/xml` ``.
 */
export class MediaTypes extends SnippetBase {
  label: 'Content type' | 'Content types'
  mediaTypes: List<InlineCode[], ', ', 'none'>

  constructor({ context, mediaTypes }: MediaTypesArgs) {
    super({ context })

    this.label = mediaTypes.length === 1 ? 'Content type' : 'Content types'
    this.mediaTypes = new List(
      mediaTypes.map(mediaType => new InlineCode({ context, value: mediaType })),
      { separator: ', ' }
    )
  }

  override toString(): string {
    return `${this.label}: ${this.mediaTypes}`
  }
}
