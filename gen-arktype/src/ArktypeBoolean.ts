import { ContentBase } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContextType } from '@skmtc/core'

type ArktypeBooleanArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeBoolean extends ContentBase {
  type = 'boolean' as const
  modifiers: Modifiers
  
  constructor({ context, generatorKey, destinationPath, modifiers }: ArktypeBooleanArgs) {
    super({ context, generatorKey })
    
    this.modifiers = modifiers
    context.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    return applyModifiers('boolean', this.modifiers)
  }
}