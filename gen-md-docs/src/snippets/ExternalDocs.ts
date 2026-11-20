import { SnippetBase, type GenerateContextType } from '@skmtc/core'

/** The bits of an OpenAPI `externalDocs` object we render (core doesn't export the type). */
export type ExternalDocsData = {
  url: string
  description: string | undefined
}

type ExternalDocsArgs = {
  context: GenerateContextType
  externalDocs: ExternalDocsData
  label?: string
}

/**
 * A link to external documentation — the Markdown counterpart of the docs
 * viewer's `ExternalDocs`: `**See also:** [Pet docs](https://example.com/pets)`.
 * The link text is the description, else the URL.
 */
export class ExternalDocs extends SnippetBase {
  label: string
  text: string
  url: string

  constructor({ context, externalDocs, label = 'See also' }: ExternalDocsArgs) {
    super({ context })

    this.label = label
    this.text = externalDocs.description ?? externalDocs.url
    this.url = externalDocs.url
  }

  override toString(): string {
    return `**${this.label}:** [${this.text}](${this.url})`
  }
}
