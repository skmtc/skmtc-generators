import { SnippetBase, type GenerateContextType, type Stringable } from '@skmtc/core'

type HeadingArgs = {
  context: GenerateContextType
  level: 1 | 2 | 3
  text: Stringable
}

/** A Markdown heading: `## Path parameters`, ``### `200` — OK``. */
export class Heading extends SnippetBase {
  level: 1 | 2 | 3
  text: Stringable

  constructor({ context, level, text }: HeadingArgs) {
    super({ context })

    this.level = level
    this.text = text
  }

  override toString(): string {
    return `${'#'.repeat(this.level)} ${this.text}`
  }
}
