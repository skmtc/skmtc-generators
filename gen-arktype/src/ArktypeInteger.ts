import { ContentBase } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContext, OasInteger } from '@skmtc/core'

type ArktypeIntegerArgs = {
  context: GenerateContext
  integerSchema: OasInteger
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeInteger extends ContentBase {
  type = 'integer' as const
  format: string | undefined
  modifiers: Modifiers
  
  constructor({ context, integerSchema, generatorKey, destinationPath, modifiers }: ArktypeIntegerArgs) {
    super({ context, generatorKey })
    
    this.format = integerSchema.format
    this.modifiers = modifiers
    context.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    // Arktype uses "number" for integers as well
    return applyModifiers('number', this.modifiers)
  }
}