import type { OasRef, OasSchema } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import { toAtomicSyntax } from './toAtomicSyntax.ts'
import type { Modifiers, GeneratorKey, GenerateContextType } from '@skmtc/core'

type ArktypeBooleanArgs = {
  /** Originating schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeBoolean extends TsSnippet {
  type = 'boolean' as const
  stringSyntax: string
  atomicStringSyntax: string
  modifiers: Modifiers

  constructor({ context, generatorKey, modifiers, schema }: ArktypeBooleanArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.modifiers = modifiers
    this.stringSyntax = applyModifiers('boolean', modifiers)
    this.atomicStringSyntax = toAtomicSyntax(this.stringSyntax)
  }

  override toString(): string {
    return `"${this.stringSyntax}"`
  }
}
