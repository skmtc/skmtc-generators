import { SnippetBase, type GenerateContextType } from '@skmtc/core'
import { Description } from '@/src/snippets/Description.ts'
import { Loop, Maybe, Wrap } from '@/src/Maybe.ts'

type SummaryArgs = {
  context: GenerateContextType
  summary: string | undefined
  description: string | undefined
}

/**
 * Renders an operation's title and description — the Markdown counterpart of the
 * docs viewer's `OperationSummary`. The summary renders as a level-one heading;
 * the description follows as a paragraph.
 *
 * Either part may be absent, but not both: the parent builds a `Summary` only
 * when there is something to show, with
 * `new Maybe(new Loop([summary?.trim(), description?.trim()]), () => new Summary(…))`.
 */
export class Summary extends SnippetBase {
  parts: Loop

  constructor({ context, summary, description }: SummaryArgs) {
    super({ context })

    this.parts = new Loop(
      [
        Maybe.nonEmptyText(summary?.trim(), present => new Wrap(['# ', present])),
        Maybe.nonEmptyText(
          description?.trim(),
          present => new Description({ context, description: present })
        )
      ],
      { separator: '\n\n' }
    )
  }

  override toString(): string {
    return `${this.parts}`
  }
}
