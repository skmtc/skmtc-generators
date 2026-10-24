import { SnippetBase, type GenerateContextType } from '@skmtc/core'
import { Description } from './Description.ts'
import { Loop, Maybe, Wrap } from '../Maybe.ts'

type SummaryArgs = {
  context: GenerateContextType
  summary: string | undefined
  description: string | undefined
}

/**
 * Renders an operation's title and description — the Markdown counterpart of the
 * docs viewer's `OperationSummary`. The summary renders as a level-one heading;
 * the description follows as a paragraph. Either may be absent.
 */
export class Summary extends SnippetBase {
  content: Loop

  constructor({ context, summary, description }: SummaryArgs) {
    super({ context })

    this.content = new Loop(
      [
        new Maybe(summary?.trim(), present => new Wrap(['# ', present])),
        new Maybe(
          description?.trim(),
          present => new Description({ context, description: present })
        )
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.content}`
  }
}
