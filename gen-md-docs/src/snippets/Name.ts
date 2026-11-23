import { SnippetBase, type GenerateContextType } from '@skmtc/core'

type NameArgs = {
  context: GenerateContextType
  name: string
}

/** A property, parameter or header name in bold, e.g. `**id**`. */
export class Name extends SnippetBase {
  name: string

  constructor({ context, name }: NameArgs) {
    super({ context })

    this.name = name
  }

  override toString(): string {
    return `**${this.name}**`
  }
}
