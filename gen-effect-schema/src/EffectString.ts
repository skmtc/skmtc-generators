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
      ? toLiterals(this.enums)
      : `${LIB}.String${this.checks}`

    return applyModifiers(content, withNullMember(this.modifiers, this.enums))
  }
}
