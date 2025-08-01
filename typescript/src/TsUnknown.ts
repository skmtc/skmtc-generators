import { type GenerateContext, ContentBase, type GeneratorKey } from '@skmtc/core'

type ConstructorArgs = {
  context: GenerateContext
  generatorKey: GeneratorKey
}

export class TsUnknown extends ContentBase {
  type = 'unknown' as const

  constructor({ context, generatorKey }: ConstructorArgs) {
    super({ context, generatorKey })
  }

  override toString(): string {
    return 'unknown'
  }
}
