import { SnippetBase, type GenerateContextType } from '@skmtc/core'
import { Maybe, Wrap } from '../Maybe.ts'

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
  content: Maybe<string, Wrap>

  constructor({ context, name }: NameArgs) {
    super({ context })

    this.content = new Maybe(name, present => new Wrap(['**', present, '**']))
  }

  override toString(): string {
    return `${this.content}`
  }
}
