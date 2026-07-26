import type { OasRef, OasSchema } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import { toAtomicSyntax } from './toAtomicSyntax.ts'
import type { Modifiers, GeneratorKey, GenerateContextType } from '@skmtc/core'

type ArktypeNumberArgs = {
  /** Originating schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeNumber extends TsSnippet {
  type = 'number' as const
  stringSyntax: string
  atomicStringSyntax: string
  modifiers: Modifiers

  constructor({ context, generatorKey, modifiers, schema }: ArktypeNumberArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.modifiers = modifiers
    this.stringSyntax = applyModifiers('number', modifiers)
    this.atomicStringSyntax = toAtomicSyntax(this.stringSyntax)
  }

  override toString(): string {
    return `"${this.stringSyntax}"`
  }
}
