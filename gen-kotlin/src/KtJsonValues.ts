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
 * Union (`oneOf`) schema → `JsonElement` — the documented v1 fallback.
 * The sealed-interface treatment (inverse-membership scan, discriminator
 * wiring, degenerate unions) is the named follow-up in note 19; until
 * then unions round-trip losslessly as raw JSON. Members are deliberately
 * NOT built — building them would synthesize unused data classes.
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
