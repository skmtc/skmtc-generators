import { SnippetBase, type GenerateContextType } from '@skmtc/core'
import { Loop, Wrap } from '@/src/Maybe.ts'

type EnumsArgs = {
  context: GenerateContextType
  enums: readonly unknown[]
}

/**
 * Renders a schema's allowed values as an inline-code list, e.g.
 * `` (`active`, `inactive`) ``.
 *
 * Always renders: a parent builds it through
 * `Maybe.nonEmpty(enums, values => new Enums(…))`, and an empty list of allowed
 * values is absent, so it is never built.
 */
export class Enums extends SnippetBase {
  values: Loop

  constructor({ context, enums }: EnumsArgs) {
    super({ context })

    this.values = new Loop(enums.map(value => new Wrap(['`', String(value), '`'])))
  }

  override toString(): string {
    return `(${this.values})`
  }
}
