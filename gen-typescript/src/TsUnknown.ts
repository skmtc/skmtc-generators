import { type GenerateContextType, ContentBase, type GeneratorKey } from '@skmtc/core'

type ConstructorArgs = {
  context: GenerateContextType
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
