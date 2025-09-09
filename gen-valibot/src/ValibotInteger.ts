import { ContentBase } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContext, OasInteger } from '@skmtc/core'

type ValibotIntegerArgs = {
  context: GenerateContext
  integerSchema: OasInteger
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ValibotInteger extends ContentBase {
  type = 'integer' as const
  modifiers: Modifiers

  constructor({ context, generatorKey, destinationPath, modifiers }: ValibotIntegerArgs) {
    super({ context, generatorKey })

    this.modifiers = modifiers

    context.register({ imports: { valibot: ['v'] }, destinationPath })
  }

  override toString(): string {
    const content = 'v.pipe(v.number(), v.integer())'
    return applyModifiers(content, this.modifiers)
  }
}