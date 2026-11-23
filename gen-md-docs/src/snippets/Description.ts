import { SnippetBase, type GenerateContextType } from '@skmtc/core'

type DescriptionArgs = {
  context: GenerateContextType
  /** The description's text, trimmed and not empty. */
  description: string
}

/** A description, as its own paragraph. */
export class Description extends SnippetBase {
  description: string

  constructor({ context, description }: DescriptionArgs) {
    super({ context })

    this.description = description
  }

  override toString(): string {
    return this.description
  }
}

/** A description at the end of a row, after an em dash: `— The pet's name`. */
export class DescriptionClause extends SnippetBase {
  description: string

  constructor({ context, description }: DescriptionArgs) {
    super({ context })

    this.description = description
  }

  override toString(): string {
    return `— ${this.description}`
  }
}
