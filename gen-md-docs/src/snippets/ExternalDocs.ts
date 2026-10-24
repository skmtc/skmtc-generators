import { SnippetBase, type GenerateContextType } from '@skmtc/core'
import { Wrap } from '@/src/Maybe.ts'

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
 * A "see also" link to external documentation (`externalDocs` at the document,
 * operation or tag level). Always renders: a parent builds it through
 * `new Maybe(externalDocs, docs => new ExternalDocs(…))`.
 */
export class ExternalDocs extends SnippetBase {
  link: Wrap

  constructor({ context, externalDocs, label = 'See also' }: ExternalDocsArgs) {
    super({ context })

    this.link = new Wrap([
      '**',
      label,
      ':** [',
      externalDocs.description ?? externalDocs.url,
      '](',
      externalDocs.url,
      ')'
    ])
  }

  override toString(): string {
    return `${this.link}`
  }
}
