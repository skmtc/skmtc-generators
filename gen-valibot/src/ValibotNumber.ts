import { ContentBase } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContextType } from '@skmtc/core'

type ValibotNumberArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ValibotNumber extends ContentBase {
  type = 'number' as const
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers }: ValibotNumberArgs) {
    super({ context, generatorKey })

    this.modifiers = modifiers

    context.register({ imports: { valibot: ['v'] }, destinationPath })
  }

  override toString(): string {
    const content = 'v.number()'
    return applyModifiers(content, this.modifiers)
  }
}