import { SnippetBase, type GenerateContextType } from '@skmtc/core'
import { Maybe, Wrap } from '../Maybe.ts'
import type { CollatedExample } from '../toExample.ts'

type ExampleArgs = {
  context: GenerateContextType
  example: CollatedExample
}

/**
 * Renders an example value — the Markdown counterpart of the docs viewer's
 * `Example` / `JsonBlock`.
 *
 * An object or array renders as a fenced ```json block; a scalar renders
 * inline as `` Example: `value` ``. Always renders: a parent builds it through
 * `new Maybe(toExample(schema), example => new Example(…))`. The collation of
 * a schema into an example value is the caller's concern (`toExample`), which
 * holds the value in an object so that `false`, `''` and `[]` stay present.
 */
export class Example extends SnippetBase {
  block: Maybe<true, Wrap, Wrap>

  constructor({ context, example }: ExampleArgs) {
    super({ context })

    const { value } = example

    this.block = Maybe.when(
      typeof value === 'object',
      () => new Wrap(['```json\n', JSON.stringify(value, null, 2), '\n```']),
      () => new Wrap(['Example: `', String(value), '`'])
    )
  }

  override toString(): string {
    return `${this.block}`
  }
}
