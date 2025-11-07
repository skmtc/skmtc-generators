import type { GeneratorKey, Modifiers, GenerateContextType } from '@skmtc/core'
import { ContentBase } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'

type TsBooleanArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

export class TsBoolean extends ContentBase {
  type = 'boolean' as const
  modifiers: Modifiers

  constructor({ context, modifiers, generatorKey }: TsBooleanArgs) {
    super({ context, generatorKey })

    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers(`boolean`, this.modifiers)
  }
}
