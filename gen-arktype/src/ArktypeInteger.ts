import { SnippetBase } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContextType, OasInteger } from '@skmtc/core'

type ArktypeIntegerArgs = {
  context: GenerateContextType
  integerSchema: OasInteger
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeInteger extends SnippetBase {
  type = 'integer' as const
  format: string | undefined
  modifiers: Modifiers
  
  constructor({ context, integerSchema, generatorKey, destinationPath, modifiers }: ArktypeIntegerArgs) {
    super({ context, generatorKey, schema: integerSchema })
    
    this.format = integerSchema.format
    this.modifiers = modifiers
    this.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    // Arktype uses "number" for integers as well
    return applyModifiers('number', this.modifiers)
  }
}