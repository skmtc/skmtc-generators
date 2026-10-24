import { SnippetBase, type GenerateContextType } from '@skmtc/core'
import { Maybe } from '../Maybe.ts'

type DescriptionArgs = {
  context: GenerateContextType
  description: string | undefined
}

/**
 * Renders an optional schema / operation description.
 *
 * Descriptions are already CommonMark / GFM in the source document, so this
 * passes the text through verbatim (trimmed). It renders the empty string when
 * the description is absent, so a parent can interpolate `${this.content}`
 * unconditionally without branching. A parent that joins parts in a `Loop`
 * uses `.content` (the `Maybe`), so an absent description also drops its
 * separator: the `Loop` cannot see that a Snippet renders empty.
 */
export class Description extends SnippetBase {
  content: Maybe<string>

  constructor({ context, description }: DescriptionArgs) {
    super({ context })

    this.content = new Maybe(description?.trim())
  }

  override toString(): string {
    return `${this.content}`
  }
}
