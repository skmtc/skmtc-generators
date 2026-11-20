import { SnippetBase, type GenerateContextType } from '@skmtc/core'

type InlineCodeArgs = {
  context: GenerateContextType
  value: string
}

/** A value as Markdown inline code, e.g. `` `active` ``. */
export class InlineCode extends SnippetBase {
  value: string

  constructor({ context, value }: InlineCodeArgs) {
    super({ context })

    this.value = value
  }

  override toString(): string {
    return `\`${this.value}\``
  }
}
