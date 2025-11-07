import type { GeneratorKey, Modifiers, GenerateContextType } from '@skmtc/core'
import { ContentBase } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'

type TsNumberArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

export class TsNumber extends ContentBase {
  type = 'number' as const
  modifiers: Modifiers

  constructor({ context, modifiers, generatorKey }: TsNumberArgs) {
    super({ context, generatorKey })

    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers(`number`, this.modifiers)
  }
}
