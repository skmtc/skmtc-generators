import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'
import { handleKey, handlePropertyName } from '@skmtc/lang-typescript'

type QueryEntryArgs = {
  context: GenerateContextType
  name: string
}

/**
 * `key: params.key` — one query parameter, read straight off `params`.
 * `UrlParams` drops an `undefined`, so an optional parameter left out is
 * left out of the request too.
 */
export class QueryEntry extends SnippetBase {
  name: string

  constructor({ context, name }: QueryEntryArgs) {
    super({ context })

    this.name = name
  }

  override toString(): string {
    return `${handleKey(this.name)}: ${handlePropertyName(this.name, 'params')}`
  }
}
