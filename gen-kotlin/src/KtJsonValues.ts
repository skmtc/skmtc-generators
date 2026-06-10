import { KtSnippet } from '@skmtc/lang-kotlin'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasUnion,
  OasUnknown,
  TypeSystemValue
} from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'

type KtUnknownArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  destinationPath: string
  modifiers: Modifiers
  schema?: OasUnknown
}

/** Unknown schema → `kotlinx.serialization.json.JsonElement`. */
export class KtUnknown extends KtSnippet {
  type = 'unknown' as const
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers, schema }: KtUnknownArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.modifiers = modifiers

    this.register({
      imports: { 'kotlinx.serialization.json': ['JsonElement'] },
      destinationPath
    })
  }

  override toString(): string {
    return applyModifiers('JsonElement', this.modifiers)
  }
}

type KtUnionArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  destinationPath: string
  modifiers: Modifiers
  schema: OasUnion
}

/**
 * Union (`oneOf`) schema at the VALUE layer → `JsonElement`, the
 * documented fallback. A QUALIFYING discriminated union never reaches
 * this class at the top level (`toKtProjection` routes it to the
 * sealed-interface projection); inline unions can never be sealed (no
 * refName for the membership inversion), so they take the fallback
 * here. Members are deliberately NOT built — building them would
 * synthesize unused data classes.
 *
 * Single-member unions never reach this class at all: core's parse
 * collapses `oneOf: [X]` into `X` itself (spec 22 decision 4 turned out
 * to be satisfied upstream — verified against core 0.9.0: inline
 * members collapse to the member schema, ref members to the ref).
 */
export class KtUnion extends KtSnippet {
  type = 'union' as const
  members: TypeSystemValue[] = []
  discriminator: string | undefined = undefined
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers, schema }: KtUnionArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers

    this.register({
      imports: { 'kotlinx.serialization.json': ['JsonElement'] },
      destinationPath
    })
  }

  override toString(): string {
    return applyModifiers('JsonElement', this.modifiers)
  }
}
