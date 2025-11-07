import { ContentBase } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContextType } from '@skmtc/core'

type ArktypeNumberArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeNumber extends ContentBase {
  type = 'number' as const
  modifiers: Modifiers
  
  constructor({ context, generatorKey, destinationPath, modifiers }: ArktypeNumberArgs) {
    super({ context, generatorKey })
    
    this.modifiers = modifiers
    context.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    return applyModifiers('number', this.modifiers)
  }
}