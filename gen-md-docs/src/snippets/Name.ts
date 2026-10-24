import { SnippetBase, type GenerateContextType } from '@skmtc/core'

type NameArgs = {
  context: GenerateContextType
  name: string
}

/**
 * Renders a property name in bold, e.g. `**id**`.
 *
 * Always renders: a parent with an optional name (a root schema has none)
 * builds it through `Maybe.nonEmptyText(name, present => new Name(…))`.
 */
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
