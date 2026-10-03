import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'
import { List, type ListObject } from '@skmtc/lang-typescript'
import { QueryEntry } from './QueryEntry.ts'

type UrlParamsStepArgs = {
  context: GenerateContextType
  names: string[]
}

/** `HttpClientRequest.setUrlParams({ … })` — the query parameters, off `params`. */
export class UrlParamsStep extends SnippetBase {
  entries: ListObject<QueryEntry>

  constructor({ context, names }: UrlParamsStepArgs) {
    super({ context })

    this.entries = List.toObject(
      names.map((name) => new QueryEntry({ context, name })),
    )
  }

  override toString(): string {
    return `HttpClientRequest.setUrlParams(${this.entries})`
  }
}
