import type { OasRef, OasSchema } from '@skmtc/core'
import { SnippetBase } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContextType } from '@skmtc/core'

type ArktypeNumberArgs = {
  /** Originating schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeNumber extends SnippetBase {
  type = 'number' as const
  modifiers: Modifiers
  
  constructor({ context, generatorKey, destinationPath, modifiers, schema }: ArktypeNumberArgs) {
    super({ context, generatorKey, schema })
    
    this.modifiers = modifiers
    context.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    return applyModifiers('number', this.modifiers)
  }
}