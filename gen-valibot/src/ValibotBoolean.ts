import { TypescriptSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import type {
  Modifiers,
  GeneratorKey,
  GenerateContextType,
  OasRef,
  OasSchema
} from '@skmtc/core'

type ValibotBooleanArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
  /** The originating boolean schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class ValibotBoolean extends TypescriptSnippet {
  type = 'boolean' as const
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers, schema }: ValibotBooleanArgs) {
    super({ context, generatorKey, schema })

    this.modifiers = modifiers

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    const content = 'v.boolean()'
    return applyModifiers(content, this.modifiers)
  }
}
