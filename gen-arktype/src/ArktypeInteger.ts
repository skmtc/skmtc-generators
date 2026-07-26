import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import { toAtomicSyntax } from './toAtomicSyntax.ts'
import type { Modifiers, GeneratorKey, GenerateContextType, OasInteger } from '@skmtc/core'

type ArktypeIntegerArgs = {
  context: GenerateContextType
  integerSchema: OasInteger
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeInteger extends TsSnippet {
  type = 'integer' as const
  stringSyntax: string
  atomicStringSyntax: string
  modifiers: Modifiers

  constructor({ context, integerSchema, generatorKey, modifiers }: ArktypeIntegerArgs) {
    super({ context, generatorKey, stackTrail: integerSchema.stackTrail.clone() })

    this.modifiers = modifiers
    // `integer` is not an arktype keyword — the integrality constraint would be
    // `number.integer`. Plain `number` is what this generator has always
    // emitted; tightening it is a separate change.
    this.stringSyntax = applyModifiers('number', modifiers)
    this.atomicStringSyntax = toAtomicSyntax(this.stringSyntax)
  }

  override toString(): string {
    return `"${this.stringSyntax}"`
  }
}
