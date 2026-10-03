import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'
import { handleKey, handlePropertyName } from '@skmtc/lang-typescript'

type HeaderEntryArgs = {
  context: GenerateContextType
  name: string
}

/**
 * One header parameter, read off `params`. A header is a string on the
 * wire, so a numeric parameter is rendered as one; `Headers` drops an
 * `undefined`, so an optional header left out is left out of the request.
 */
export class HeaderEntry extends SnippetBase {
  name: string

  constructor({ context, name }: HeaderEntryArgs) {
    super({ context })

    this.name = name
  }

  override toString(): string {
    const value = handlePropertyName(this.name, 'params')

    return `${
      handleKey(this.name)
    }: ${value} === undefined ? undefined : String(${value})`
  }
}
