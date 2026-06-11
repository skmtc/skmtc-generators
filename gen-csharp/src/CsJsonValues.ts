import { CsSnippet } from '@skmtc/lang-csharp'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasUnion,
  OasUnknown,
  TypeSystemValue
} from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'

type CsUnknownArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  destinationPath: string
  modifiers: Modifiers
  schema?: OasUnknown
}

/** Unknown schema → `System.Text.Json.JsonElement` (D13). */
export class CsUnknown extends CsSnippet {
  type = 'unknown' as const
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers, schema }: CsUnknownArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.modifiers = modifiers

    this.register({
      imports: { 'System.Text.Json': ['JsonElement'] },
      destinationPath
    })
  }

  override toString(): string {
    return applyModifiers('JsonElement', this.modifiers)
  }
}

type CsUnionArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  destinationPath: string
  modifiers: Modifiers
  schema: OasUnion
}

/**
 * Union (`oneOf`) schema at the VALUE layer → `JsonElement`, the
 * documented CS-A fallback (D13). The polymorphic abstract-record
 * mapping for qualifying discriminated unions arrives at CS-B (the
 * dispatch routes them before the value layer); union hints (the spec-26
 * analog) arrive at CS-D. Members are deliberately NOT built — building
 * them would synthesize unused records.
 *
 * Single-member unions never reach this class at all: core's parse
 * collapses `oneOf: [X]` into `X` itself (verified against core 0.9.0).
 */
export class CsUnion extends CsSnippet {
  type = 'union' as const
  members: TypeSystemValue[] = []
  discriminator: string | undefined = undefined
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers, schema }: CsUnionArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers

    this.register({
      imports: { 'System.Text.Json': ['JsonElement'] },
      destinationPath
    })
  }

  override toString(): string {
    return applyModifiers('JsonElement', this.modifiers)
  }
}
