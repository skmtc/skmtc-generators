import type { GenerateContextType } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { InlineCode } from './InlineCode.ts'

type EnumsArgs = {
  context: GenerateContextType
  enums: readonly unknown[]
}

/**
 * A schema's allowed values, as inline code: ``(`active`, `inactive`)``.
 * Renders the empty string when there are none.
 */
export class Enums extends List<InlineCode[], ', ', '()'> {
  constructor({ context, enums }: EnumsArgs) {
    super(
      enums.map(value => new InlineCode({ context, value: String(value) })),
      { separator: ', ', bookends: '()', skipEmpty: true }
    )
  }
}
