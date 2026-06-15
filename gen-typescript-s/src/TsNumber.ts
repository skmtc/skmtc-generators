import type { GeneratorKey, Modifiers, GenerateContextType, OasRef, OasSchema } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'

type TsNumberArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  generatorKey: GeneratorKey
  /** The originating number schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class TsNumber extends TsSnippet {
  type = 'number' as const
  modifiers: Modifiers

  constructor({ context, modifiers, generatorKey, schema }: TsNumberArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers(`number`, this.modifiers)
  }
}
