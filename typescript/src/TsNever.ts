import { type GenerateContext, ContentBase, type GeneratorKey } from '@skmtc/core'

type ConstructorArgs = {
  context: GenerateContext
  generatorKey: GeneratorKey
}

export class TsNever extends ContentBase {
  type = 'never' as const

  constructor({ context, generatorKey }: ConstructorArgs) {
    super({ context, generatorKey })
  }

  override toString(): string {
    return 'never'
  }
}
