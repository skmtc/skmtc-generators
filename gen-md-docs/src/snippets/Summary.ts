import { SnippetBase, type GenerateContextType } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { Description } from './Description.ts'
import { Heading } from './Heading.ts'

type SummaryArgs = {
  context: GenerateContextType
  /** The summary, trimmed; `undefined` when there is none. */
  summary: string | undefined
  /** The description, trimmed; `undefined` when there is none. */
  description: string | undefined
}

/**
 * An operation's summary as its `#` heading, then its description — the
 * Markdown counterpart of the docs viewer's `Summary`. Each block is written
 * only when the operation has it.
 */
export class Summary extends SnippetBase {
  blocks: List<(Heading | Description)[], '\n\n', 'none'>

  constructor({ context, summary, description }: SummaryArgs) {
    super({ context })

    this.blocks = new List<(Heading | Description)[], '\n\n', 'none'>(
      [
        summary ? new Heading({ context, level: 1, text: summary }) : undefined,
        description ? new Description({ context, description }) : undefined
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.blocks}`
  }
}
