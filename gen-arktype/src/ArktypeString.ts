import { toRegExpLiteral, toStringLiteral, TsSnippet, withDescription } from '@skmtc/lang-typescript'
import { applyModifiers, applyValueModifiers } from './applyModifiers.ts'
import { ArktypeStringBounds } from './ArktypeStringBounds.ts'
import { toAtomicSyntax } from './toAtomicSyntax.ts'
import type { Modifiers, GeneratorKey, GenerateContextType, OasString } from '@skmtc/core'

type ArktypeStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeString extends TsSnippet {
  type = 'string' as const
  /** The enum, or the keyword of the format with the lengths, before the modifiers. */
  content: string
  /**
   * The pattern as a regex literal. Arktype's string syntax has no regex
   * flags, and a pattern needs `u`, so the pattern is a `RegExp` value
   * beside the string syntax: `["string", "&", /^\p{L}+$/u]`.
   */
  pattern: string | undefined
  /** A `pattern` JavaScript rejects, left unchecked and named in a comment. */
  skippedPattern: string | undefined
  /** The string syntax, or `undefined` when a pattern needs the value form. */
  stringSyntax: string | undefined
  atomicStringSyntax: string | undefined
  modifiers: Modifiers
  /** Carried for the core `TypeSystemString` contract. */
  format: string | undefined
  enums: string[] | (string | null)[] | undefined

  constructor({ context, stringSchema, generatorKey, modifiers }: ArktypeStringArgs) {
    super({ context, generatorKey, stackTrail: stringSchema.stackTrail.clone() })

    this.modifiers = modifiers
    this.format = stringSchema.format
    this.enums = stringSchema.enums

    // An enum lists every value it accepts, so the format, length and
    // pattern checks add nothing.
    this.content = Array.isArray(stringSchema.enums)
      ? toContent(stringSchema.enums)
      : `${new ArktypeStringBounds({
        context,
        format: stringSchema.format,
        minLength: stringSchema.minLength,
        maxLength: stringSchema.maxLength
      })}`

    // An enum drops the pattern, so it has nothing to warn about.
    if (stringSchema.pattern && stringSchema.enums === undefined) {
      this.pattern = toPatternLiteral(stringSchema.pattern)

      if (this.pattern === undefined) {
        this.skippedPattern = stringSchema.pattern

        // A warning sets this model's result to 'warning', so the CLI and
        // the manifest show it, not only the comment in the output.
        context.logger.warn(toSkippedPatternNote(stringSchema.pattern))
      }
    }

    this.stringSyntax = this.pattern === undefined ? applyModifiers(this.content, modifiers) : undefined
    this.atomicStringSyntax = this.stringSyntax === undefined ? undefined : toAtomicSyntax(this.stringSyntax)
  }

  override toString(): string {
    const content = this.stringSyntax === undefined
      ? applyValueModifiers(`[${JSON.stringify(this.content)}, "&", ${this.pattern}]`, this.modifiers)
      : JSON.stringify(this.stringSyntax)

    // The trap: a pattern written for another engine (`(?i)`) makes the
    // whole file fail to parse, and throwing fails the whole run. So the
    // check is left out, and the comment says which pattern and why.
    return this.skippedPattern === undefined ? content : withDescription(content, {
      description: toSkippedPatternNote(this.skippedPattern)
    })
  }
}

const toContent = (enums: string[] | (string | null)[]): string => {
  // An empty `enum: []` accepts nothing. Joined, it gave `type("")`,
  // which arktype cannot parse.
  return enums.length === 0 ? 'never' : enums.map(toEnumMember).join(' | ')
}

/**
 * Renders one enum member as arktype string syntax. A `null` member is the
 * `null` keyword, not the four-character string `'null'`, and a value carrying
 * a quote or a backslash has to escape it — either would otherwise end the
 * literal early and produce a definition arktype cannot parse.
 */
const toEnumMember = (value: string | null): string =>
  value === null ? 'null' : `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

// Copied from gen-effect-schema's EffectString.ts, as gen-zod's ZodString
// does (#130, #132): no package the validators all import holds it yet.

/** Says which pattern was left out and why, in the output and the warning. */
const toSkippedPatternNote = (pattern: string): string =>
  `pattern ${toStringLiteral(pattern)} is not a JavaScript regex, so it is not checked`

/**
 * The pattern as a regex literal, or `undefined` when JavaScript rejects it.
 *
 * The trap: without the `u` flag, `^\p{L}+$` is valid and matches the text
 * `p{L}`, not a letter. JSON Schema patterns mean Unicode, so `u` comes
 * first. A pattern valid only without it (`\-` outside a class) falls back to
 * no flag.
 */
const toPatternLiteral = (pattern: string): string | undefined =>
  tryRegExpLiteral(pattern, 'u') ?? tryRegExpLiteral(pattern, '')

/**
 * `toRegExpLiteral` lets the engine escape the literal, and throws a
 * `SyntaxError` on a pattern or flags it rejects.
 */
const tryRegExpLiteral = (pattern: string, flags: string): string | undefined => {
  try {
    return toRegExpLiteral(pattern, flags)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined
    }

    // `new RegExp` with string arguments throws only a SyntaxError, so no
    // test reaches this line. It stays, as in EffectString, for any other error.
    // deno-coverage-ignore-start
    throw error
  }
  // deno-coverage-ignore-stop
}
