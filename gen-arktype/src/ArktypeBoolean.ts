import type { OasRef, OasSchema } from '@skmtc/core'
import { TypescriptSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContextType } from '@skmtc/core'

type ArktypeBooleanArgs = {
  /** Originating schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
  context: GenerateContextType
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeBoolean extends TypescriptSnippet {
  type = 'boolean' as const
  modifiers: Modifiers
  
  constructor({ context, generatorKey, destinationPath, modifiers, schema }: ArktypeBooleanArgs) {
    super({ context, generatorKey, schema })
    
    this.modifiers = modifiers
    this.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    return applyModifiers('boolean', this.modifiers)
  }
}