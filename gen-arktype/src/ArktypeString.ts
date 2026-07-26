import { TsSnippet } from '@skmtc/lang-typescript'
import { match, P } from 'ts-pattern'
import { applyModifiers } from './applyModifiers.ts'
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
  stringSyntax: string
  atomicStringSyntax: string
  modifiers: Modifiers
  /** Carried for the core `TypeSystemString` contract. */
  format: string | undefined
  enums: string[] | (string | null)[] | undefined

  constructor({ context, stringSchema, generatorKey, modifiers }: ArktypeStringArgs) {
    super({ context, generatorKey, stackTrail: stringSchema.stackTrail.clone() })

    this.modifiers = modifiers
    this.format = stringSchema.format
    this.enums = stringSchema.enums

    const content = match({ enums: stringSchema.enums })
      .with({ enums: P.array() }, matched => matched.enums.map(value => `'${value}'`).join(' | '))
      .otherwise(() => 'string')

    this.stringSyntax = applyModifiers(content, modifiers)
    this.atomicStringSyntax = toAtomicSyntax(this.stringSyntax)
  }

  override toString(): string {
    return `"${this.stringSyntax}"`
  }
}
