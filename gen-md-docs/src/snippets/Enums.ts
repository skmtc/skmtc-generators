import { SnippetBase, type GenerateContextType } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'

type EnumsArgs = {
  context: GenerateContextType
  enums: readonly unknown[] | undefined
}

/**
 * Renders a schema's allowed values as an inline-code list, e.g.
 * `` (`active`, `inactive`) ``.
 *
 * The values are arranged into a parenthesised, comma-separated {@link List} in
 * the constructor; `skipEmpty` makes it render the empty string when there are
 * no allowed values, so a parent can interpolate it unconditionally.
 */
export class Enums extends SnippetBase {
  values: List

  constructor({ context, enums }: EnumsArgs) {
    super({ context })

    this.values = new List(
      (enums ?? []).map(value => `\`${String(value)}\``),
      { separator: ', ', bookends: '()', skipEmpty: true }
    )
  }

  override toString(): string {
    return this.values.toString()
  }
}
