import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'
import { List, type ListObject } from '@skmtc/lang-typescript'
import { HeaderEntry } from './HeaderEntry.ts'

type HeadersStepArgs = {
  context: GenerateContextType
  names: string[]
}

/** `HttpClientRequest.setHeaders({ … })` — the header parameters, off `params`. */
export class HeadersStep extends SnippetBase {
  entries: ListObject<HeaderEntry>

  constructor({ context, names }: HeadersStepArgs) {
    super({ context })

    this.entries = List.toObject(
      names.map((name) => new HeaderEntry({ context, name })),
    )
  }

  override toString(): string {
    return `HttpClientRequest.setHeaders(${this.entries})`
  }
}
