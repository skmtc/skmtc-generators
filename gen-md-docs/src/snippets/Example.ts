import { SnippetBase, type GenerateContextType } from '@skmtc/core'

type JsonExampleArgs = {
  context: GenerateContextType
  /** An object or array. */
  example: unknown
}

/** An object or array example, as a fenced JSON block. */
export class JsonExample extends SnippetBase {
  example: unknown

  constructor({ context, example }: JsonExampleArgs) {
    super({ context })

    this.example = example
  }

  override toString(): string {
    return `\`\`\`json\n${JSON.stringify(this.example, null, 2)}\n\`\`\``
  }
}

type InlineExampleArgs = {
  context: GenerateContextType
  /** A scalar: a string, number or boolean. */
  example: unknown
}

/** A scalar example, inline: ``Example: `42` ``. */
export class InlineExample extends SnippetBase {
  example: unknown

  constructor({ context, example }: InlineExampleArgs) {
    super({ context })

    this.example = example
  }

  override toString(): string {
    return `Example: \`${String(this.example)}\``
  }
}

type ToExampleBlockArgs = {
  context: GenerateContextType
  /** A collated example, from `toExample`. */
  example: unknown
}

/**
 * The example's block, chosen once — the Markdown counterpart of the docs
 * viewer's `Example`: a {@link JsonExample} for an object or array, an
 * {@link InlineExample} for a scalar, and `undefined` when there is no example.
 */
export const toExampleBlock = ({ context, example }: ToExampleBlockArgs): JsonExample | InlineExample | undefined => {
  if (example === null || example === undefined) {
    return undefined
  }

  return typeof example === 'object'
    ? new JsonExample({ context, example })
    : new InlineExample({ context, example })
}
