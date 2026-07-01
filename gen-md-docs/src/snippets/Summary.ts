import { SnippetBase, type GenerateContextType } from '@skmtc/core'
import { Description } from './Description.ts'

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
  summary: string | undefined
  description: Description

  constructor({ context, summary, description }: SummaryArgs) {
    super({ context })

    this.summary = summary?.trim()
    this.description = new Description({ context, description })
  }

  override toString(): string {
    const heading = this.summary ? `# ${this.summary}` : ''

    return [heading, this.description.toString()].filter(part => part !== '').join('\n\n')
  }
}
