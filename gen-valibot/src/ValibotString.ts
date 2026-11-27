import { toRegExpLiteral, toStringLiteral, TsSnippet, withDescription } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import { formatActions } from './formats.ts'
import { ValibotAction, ValibotPipe } from './ValibotPipe.ts'
import type { Modifiers, GeneratorKey, GenerateContextType, OasString } from '@skmtc/core'

type ValibotStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ValibotString extends TsSnippet {
  type = 'string' as const
  format: string | undefined
  enums: string[] | (string | null)[] | undefined
  /** `v.string()`, piped through the checks of its format, lengths and pattern. */
  pipe: ValibotPipe
  /** A `pattern` JavaScript rejects, left unchecked and named in a comment. */
  skippedPattern: string | undefined
  modifiers: Modifiers
  constructor({
    context,
    stringSchema,
    generatorKey,
    destinationPath,
    modifiers
  }: ValibotStringArgs) {
    super({ context, generatorKey, stackTrail: stringSchema.stackTrail.clone() })

    this.enums = stringSchema.enums
    this.format = stringSchema.format
    this.modifiers = modifiers
    this.pipe = new ValibotPipe({ schema: 'v.string()' })

    // A format valibot has no action for stays a plain string.
    const formatAction = this.format === undefined ? undefined : formatActions.get(this.format)

    if (formatAction !== undefined) {
      this.pipe.values.push(new ValibotAction({ context, name: formatAction }))
    }

    if (stringSchema.minLength !== undefined) {
      this.pipe.values.push(new ValibotAction({ context, name: 'minLength', value: stringSchema.minLength }))
    }

    if (stringSchema.maxLength !== undefined) {
      this.pipe.values.push(new ValibotAction({ context, name: 'maxLength', value: stringSchema.maxLength }))
    }

    // An enum drops the pattern (see `toString()`), so it has nothing to warn about.
    if (stringSchema.pattern && stringSchema.enums === undefined) {
      const literal = toPatternLiteral(stringSchema.pattern)

      if (literal === undefined) {
        this.skippedPattern = stringSchema.pattern

        // A warning sets this model's result to 'warning', so the CLI and
        // the manifest show it, not only the comment in the output.
        context.logger.warn(toSkippedPatternNote(stringSchema.pattern))
      } else {
        this.pipe.values.push(new ValibotAction({ context, name: 'regex', value: literal }))
      }
    }

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    // An enum lists every value it accepts, so the format, length and
    // pattern checks add nothing.
    if (Array.isArray(this.enums)) {
      return applyModifiers(toEnumContent(this.enums), this.modifiers)
    }

    const content = applyModifiers(`${this.pipe}`, this.modifiers)

    // The trap: a pattern written for another engine (`(?i)`) makes the
    // whole file fail to parse, and throwing fails the whole run. So the
    // check is left out, and the comment says which pattern and why.
    return this.skippedPattern === undefined ? content : withDescription(content, {
      description: toSkippedPatternNote(this.skippedPattern)
    })
  }
}

const toEnumContent = (enums: string[] | (string | null)[]): string => {
  // Core lists `null` only on a nullable schema, and the nullable
  // modifier adds `v.nullable(…)`, so the picklist lists the strings.
  // An empty `enum: []` accepts nothing.
  const members: Array<string | null> = enums
  const values = members.filter((value): value is string => value !== null)

  if (values.length === 0) {
    return members.includes(null) ? 'v.null()' : 'v.never()'
  }

  if (values.length === 1) {
    return `v.literal(${toStringLiteral(values[0])})`
  }

  return `v.picklist([${values.map(toStringLiteral).join(', ')}])`
}

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
