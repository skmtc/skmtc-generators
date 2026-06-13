import { KtSnippet } from '@skmtc/lang-kotlin'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasBoolean,
  OasInteger,
  OasNumber
} from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'

type KtIntegerArgs = {
  context: GenerateContextType
  schema: OasInteger
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

/** Integer schema → `Long` for `int64`, `Int` otherwise. Enum constraints on integers are not modeled in v1. */
export class KtInteger extends KtSnippet {
  type = 'integer' as const
  modifiers: Modifiers
  format: 'int32' | 'int64' | undefined

  constructor({ context, schema, modifiers, generatorKey }: KtIntegerArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.format = schema.format
    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers(this.format === 'int64' ? 'Long' : 'Int', this.modifiers)
  }
}

type KtNumberArgs = {
  context: GenerateContextType
  schema: OasNumber
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

/** Number schema → `Float` for `float`, `Double` otherwise. */
export class KtNumber extends KtSnippet {
  type = 'number' as const
  modifiers: Modifiers
  format: 'float' | 'double' | undefined

  constructor({ context, schema, modifiers, generatorKey }: KtNumberArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.format = schema.format
    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers(this.format === 'float' ? 'Float' : 'Double', this.modifiers)
  }
}

type KtBooleanArgs = {
  context: GenerateContextType
  schema: OasBoolean
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

/** Boolean schema → `Boolean`. */
export class KtBoolean extends KtSnippet {
  type = 'boolean' as const
  modifiers: Modifiers

  constructor({ context, schema, modifiers, generatorKey }: KtBooleanArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers('Boolean', this.modifiers)
  }
}

type KtVoidArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
}

/** Void schema → `Unit`. */
export class KtVoid extends KtSnippet {
  type = 'void' as const

  constructor({ context, generatorKey }: KtVoidArgs) {
    super({ context, generatorKey })
  }

  override toString(): string {
    return 'Unit'
  }
}
