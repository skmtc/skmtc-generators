import { SnippetBase, type GenerateContextType } from '@skmtc/core'

type NameArgs = {
  context: GenerateContextType
  name: string | undefined
}

/**
 * Renders a property name in bold, e.g. `**id**`.
 *
 * Renders the empty string when there is no name (a root schema), so a parent
 * can interpolate it unconditionally.
 */
export class Name extends SnippetBase {
  name: string | undefined

  constructor({ context, name }: NameArgs) {
    super({ context })

    this.name = name
  }

  override toString(): string {
    return this.name ? `**${this.name}**` : ''
  }
}
