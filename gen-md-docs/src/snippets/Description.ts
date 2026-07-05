import { SnippetBase, type GenerateContextType } from '@skmtc/core'

type DescriptionArgs = {
  context: GenerateContextType
  description: string | undefined
}

/**
 * Renders an optional schema / operation description.
 *
 * Descriptions are already CommonMark / GFM in the source document, so this
 * passes the text through verbatim (trimmed). It renders the empty string when
 * the description is absent, so a parent can interpolate `${this.description}`
 * unconditionally without branching.
 */
export class Description extends SnippetBase {
  description: string | undefined

  constructor({ context, description }: DescriptionArgs) {
    super({ context })

    this.description = description?.trim()
  }

  override toString(): string {
    return this.description ?? ''
  }
}
