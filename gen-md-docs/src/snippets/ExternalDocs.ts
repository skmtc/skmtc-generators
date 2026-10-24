import { SnippetBase, type GenerateContextType } from '@skmtc/core'
import { Maybe, Wrap } from '../Maybe.ts'

/** The bits of an OpenAPI `externalDocs` object we render (core doesn't export the type). */
export type ExternalDocsData = {
  url: string
  description: string | undefined
}

type ExternalDocsArgs = {
  context: GenerateContextType
  externalDocs: ExternalDocsData | undefined
  label?: string
}

/**
 * A "see also" link to external documentation (`externalDocs` at the document,
 * operation or tag level), or the empty string when none is declared.
 */
export class ExternalDocs extends SnippetBase {
  content: Maybe<ExternalDocsData, Wrap>

  constructor({ context, externalDocs, label = 'See also' }: ExternalDocsArgs) {
    super({ context })

    this.content = new Maybe(
      externalDocs,
      docs => new Wrap(['**', label, ':** [', docs.description ?? docs.url, '](', docs.url, ')'])
    )
  }

  override toString(): string {
    return `${this.content}`
  }
}
