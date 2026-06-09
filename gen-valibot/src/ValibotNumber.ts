import { TypescriptSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import type {
  Modifiers,
  GeneratorKey,
  GenerateContextType,
  OasRef,
  OasSchema
} from '@skmtc/core'

type ValibotNumberArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
  /** The originating number schema node — for fine-grained attribution. */
  schema?: OasSchema | OasRef<'schema'>
}

export class ValibotNumber extends TypescriptSnippet {
  type = 'number' as const
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers, schema }: ValibotNumberArgs) {
    super({ context, generatorKey, schema })

    this.modifiers = modifiers

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    const content = 'v.number()'
    return applyModifiers(content, this.modifiers)
  }
}
