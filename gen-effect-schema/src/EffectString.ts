import { TsSnippet } from '@skmtc/lang-typescript'
import { toRegexSource } from './toRegexSource.ts'
import type { GenerateContextType, GeneratorKey, OasString } from '@skmtc/core'
import {
  applyModifiers,
  type EffectModifiers,
  libImports,
} from './modifiers.ts'
import { EffectCheck, EffectChecks } from './EffectChecks.ts'
import { LIB, LIB_MODULE } from './lib.ts'
import { toLiterals, withNullMember } from './literals.ts'
import { opensEnum } from './openEnums.ts'

type EffectStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: EffectModifiers
  destinationPath: string
  generatorKey: GeneratorKey
  /** The `openEnums` setting: an enum of two or more members also takes any other string. */
  openEnum?: boolean
}

/**
 * The literals, or under `openEnums` the literals or any other string. The
 * literals stay in the union: they are the values the document names, and
 * a reader of the schema finds them there. Not `null`, which is the leaf's
 * nullable modifier (see `withNullMember`).
 */
const toEnum = (
  enums: string[] | (string | null)[],
  open: boolean,
): string => {
  const literals = toLiterals(enums)

  return open && opensEnum(enums)
    ? `${LIB}.Union([${literals}, ${LIB}.String])`
    : literals
}

export class EffectString extends TsSnippet {
  type = 'string' as const
  // format + enums are part of the TypeSystemString contract peers rely on.
  format: string | undefined
  enums: string[] | (string | null)[] | undefined
  checks: EffectChecks
  modifiers: EffectModifiers
  openEnum: boolean

  constructor(
    {
      context,
      stringSchema,
      generatorKey,
      destinationPath,
      modifiers,
      openEnum = false,
    }: EffectStringArgs,
  ) {
    super({
      context,
      generatorKey,
      stackTrail: stringSchema.stackTrail.clone(),
    })

    this.format = stringSchema.format
    this.enums = stringSchema.enums
    this.modifiers = modifiers
    this.openEnum = openEnum
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
      // A regex literal, so a `/` in the pattern must not end it early.
      this.checks.values.push(
        new EffectCheck({
          context,
          name: 'isPattern',
          value: `/${toRegexSource(stringSchema.pattern)}/`,
        }),
      )
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
    const content = this.enums?.length
      ? toEnum(this.enums, this.openEnum)
      : `${LIB}.String${this.checks}`

    return applyModifiers(content, withNullMember(this.modifiers, this.enums))
  }
}
