import { SnippetBase, type GenerateContextType } from '@skmtc/core'
import { Loop, Maybe, Wrap } from '../Maybe.ts'

type EnumsArgs = {
  context: GenerateContextType
  enums: readonly unknown[] | undefined
}

/**
 * Renders a schema's allowed values as an inline-code list, e.g.
 * `` (`active`, `inactive`) ``.
 *
 * The values are a comma-separated {@link Loop}; the `Maybe` around its
 * parentheses renders the empty string when there are no allowed values, so a
 * parent can interpolate it unconditionally.
 */
export class Enums extends SnippetBase {
  content: Maybe<Loop, Wrap>

  constructor({ context, enums }: EnumsArgs) {
    super({ context })

    const values = new Loop((enums ?? []).map(value => new Wrap(['`', String(value), '`'])))

    this.content = new Maybe(values, loop => new Wrap(['(', loop, ')']))
  }

  override toString(): string {
    return `${this.content}`
  }
}
