import type {
  GeneratorKey,
  Modifiers,
  GenerateContextType,
  OasRef,
  OasSchema
} from '@skmtc/core'
import { SnippetBase } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'

type TsNumberArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  generatorKey: GeneratorKey
  /** The originating number schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class TsNumber extends SnippetBase {
  type = 'number' as const
  modifiers: Modifiers

  constructor({ context, modifiers, generatorKey, schema }: TsNumberArgs) {
    super({ context, generatorKey, schema })

    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers(`number`, this.modifiers)
  }
}
