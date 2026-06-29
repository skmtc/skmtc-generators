import { CsSnippet } from '@skmtc/lang-csharp'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasBoolean,
  OasInteger,
  OasNumber
} from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'

type CsIntegerArgs = {
  context: GenerateContextType
  schema: OasInteger
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

/** Integer schema → `long` for `int64`, `int` otherwise (D12). Enum constraints on integers are not modeled in v1. */
export class CsInteger extends CsSnippet {
  type = 'integer' as const
  modifiers: Modifiers
  format: 'int32' | 'int64' | undefined

  constructor({ context, schema, modifiers, generatorKey }: CsIntegerArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.format = schema.format
    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers(this.format === 'int64' ? 'long' : 'int', this.modifiers)
  }
}

type CsNumberArgs = {
  context: GenerateContextType
  schema: OasNumber
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

/** Number schema → `float` for `float`, `double` otherwise (D12). */
export class CsNumber extends CsSnippet {
  type = 'number' as const
  modifiers: Modifiers
  format: 'float' | 'double' | undefined

  constructor({ context, schema, modifiers, generatorKey }: CsNumberArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.format = schema.format
    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers(this.format === 'float' ? 'float' : 'double', this.modifiers)
  }
}

type CsBooleanArgs = {
  context: GenerateContextType
  schema: OasBoolean
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

/** Boolean schema → `bool`. */
export class CsBoolean extends CsSnippet {
  type = 'boolean' as const
  modifiers: Modifiers

  constructor({ context, schema, modifiers, generatorKey }: CsBooleanArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers('bool', this.modifiers)
  }
}

type CsVoidArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
}

/**
 * Void schema → `object` — C# has no unit type usable as a property
 * type, and `void` is illegal outside return positions. Practically
 * unreachable in the models pipeline (void arises from empty response
 * bodies, an operations concern).
 */
export class CsVoid extends CsSnippet {
  type = 'void' as const

  constructor({ context, generatorKey }: CsVoidArgs) {
    super({ context, generatorKey })
  }

  override toString(): string {
    return 'object'
  }
}
