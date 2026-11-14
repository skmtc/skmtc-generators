import {
  toRegExpLiteral,
  toStringLiteral,
  TsSnippet,
  withDescription,
} from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey, OasString } from '@skmtc/core'
import {
  applyModifiers,
  type EffectModifiers,
  libImports,
} from './modifiers.ts'
import { EffectCheck, EffectChecks } from './EffectChecks.ts'
import { LIB, LIB_MODULE } from './lib.ts'
import { toLiterals, withNullMember } from './literals.ts'

type EffectStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: EffectModifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class EffectString extends TsSnippet {
  type = 'string' as const
  // format + enums are part of the TypeSystemString contract peers rely on.
  format: string | undefined
  enums: string[] | (string | null)[] | undefined
  checks: EffectChecks
  /** A `pattern` JavaScript rejects, left unchecked and named in a comment. */
  skippedPattern: string | undefined
  modifiers: EffectModifiers

  constructor(
    { context, stringSchema, generatorKey, destinationPath, modifiers }:
      EffectStringArgs,
  ) {
    super({
      context,
      generatorKey,
      stackTrail: stringSchema.stackTrail.clone(),
    })

    this.format = stringSchema.format
    this.enums = stringSchema.enums
    this.modifiers = modifiers
    this.checks = new EffectChecks()

    if (stringSchema.minLength !== undefined) {
      this.checks.values.push(
        new EffectCheck({
          context,
          name: 'isMinLength',
          value: stringSchema.minLength,
        }),
      )
    }

    if (stringSchema.maxLength !== undefined) {
      this.checks.values.push(
        new EffectCheck({
          context,
          name: 'isMaxLength',
          value: stringSchema.maxLength,
        }),
      )
    }

    if (stringSchema.pattern) {
      const literal = toPatternLiteral(stringSchema.pattern)

      if (literal === undefined) {
        this.skippedPattern = stringSchema.pattern
      } else {
        this.checks.values.push(
          new EffectCheck({ context, name: 'isPattern', value: literal }),
        )
      }
    }

    this.register({
      imports: { [LIB_MODULE]: libImports(modifiers) },
      destinationPath,
    })
  }

  override toString(): string {
    // `format` stays a plain string, as gen-typescript types it: the
    // wire value of a `date-time` or `uri` is a string, and a decoded
    // value the type file does not know about would not match it.
    if (this.enums?.length) {
      return applyModifiers(
        toLiterals(this.enums),
        withNullMember(this.modifiers, this.enums),
      )
    }

    const content = applyModifiers(`${LIB}.String${this.checks}`, this.modifiers)

    // The trap: a pattern written for another engine (`(?i)`) makes the
    // whole file fail to parse, and throwing fails the whole run. So the
    // check is left out, and the comment says which pattern and why.
    return this.skippedPattern === undefined ? content : withDescription(content, {
      description: `pattern ${
        toStringLiteral(this.skippedPattern)
      } is not a JavaScript regex, so it is not checked`,
    })
  }
}

/**
 * The pattern as a regex literal, or `undefined` when JavaScript rejects the
 * pattern. `toRegExpLiteral` lets the engine escape the literal and throws a
 * `SyntaxError` on an invalid pattern.
 */
const toPatternLiteral = (pattern: string): string | undefined => {
  try {
    return toRegExpLiteral(pattern)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined
    }

    throw error
  }
}
