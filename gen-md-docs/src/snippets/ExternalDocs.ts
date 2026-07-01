import { SnippetBase, type GenerateContextType } from '@skmtc/core'

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
  link: string

  constructor({ context, externalDocs, label = 'See also' }: ExternalDocsArgs) {
    super({ context })

    this.link =
      externalDocs !== undefined
        ? `**${label}:** [${externalDocs.description ?? externalDocs.url}](${externalDocs.url})`
        : ''
  }

  override toString(): string {
    return this.link
  }
}
