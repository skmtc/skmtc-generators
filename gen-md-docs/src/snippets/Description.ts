import { SnippetBase, type GenerateContextType } from '@skmtc/core'

type DescriptionArgs = {
  context: GenerateContextType
  description: string
}

/**
 * Renders a schema / operation description.
 *
 * Descriptions are already CommonMark / GFM in the source document, so this
 * passes the text through verbatim (trimmed). It always renders: a parent with
 * an optional description builds it through
 * `new Maybe(description?.trim(), present => new Description(…))`, so an absent
 * description drops out of the parent's `Loop` together with its separator.
 */
export class Description extends SnippetBase {
  description: string

  constructor({ context, description }: DescriptionArgs) {
    super({ context })

    this.description = description.trim()
  }

  override toString(): string {
    return this.description
  }
}
