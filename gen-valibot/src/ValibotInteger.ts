import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContextType, OasInteger } from '@skmtc/core'

type ValibotIntegerArgs = {
  context: GenerateContextType
  integerSchema: OasInteger
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ValibotInteger extends TsSnippet {
  type = 'integer' as const
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers, integerSchema }: ValibotIntegerArgs) {
    super({ context, generatorKey, stackTrail: integerSchema.stackTrail.clone() })

    this.modifiers = modifiers

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    const content = 'v.pipe(v.number(), v.integer())'
    return applyModifiers(content, this.modifiers)
  }
}
