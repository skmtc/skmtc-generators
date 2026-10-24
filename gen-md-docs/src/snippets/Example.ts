import { SnippetBase, type GenerateContextType, type Stringable } from '@skmtc/core'
import { Maybe, Wrap } from '../Maybe.ts'

type ExampleArgs = {
  context: GenerateContextType
  example: unknown
}

/**
 * Renders an example value — the Markdown counterpart of the docs viewer's
 * `Example` / `JsonBlock`.
 *
 * An object or array renders as a fenced ```json block; a scalar renders
 * inline as `` Example: `value` ``; an absent example renders the empty
 * string, so a parent can interpolate it unconditionally. The collation of a
 * schema into an example value is the caller's concern (`collateExamples`),
 * keeping this a generic value renderer.
 *
 * Presence is a boolean subject, not the value itself: `false` and `''` are
 * real example values here, and `Maybe` would treat them as absent.
 */
export class Example extends SnippetBase {
  content: Maybe<boolean, Stringable>

  constructor({ context, example }: ExampleArgs) {
    super({ context })

    this.content = new Maybe(example !== undefined && example !== null, () =>
      typeof example === 'object'
        ? new Wrap(['```json\n', JSON.stringify(example, null, 2), '\n```'])
        : new Wrap(['Example: `', String(example), '`'])
    )
  }

  override toString(): string {
    return `${this.content}`
  }
}
