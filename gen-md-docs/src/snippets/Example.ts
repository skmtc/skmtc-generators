import { SnippetBase, type GenerateContextType } from '@skmtc/core'

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
 */
export class Example extends SnippetBase {
  example: unknown

  constructor({ context, example }: ExampleArgs) {
    super({ context })

    this.example = example
  }

  override toString(): string {
    const { example } = this

    if (example === undefined || example === null) {
      return ''
    }

    if (typeof example === 'object') {
      return `\`\`\`json\n${JSON.stringify(example, null, 2)}\n\`\`\``
    }

    return `Example: \`${String(example)}\``
  }
}
