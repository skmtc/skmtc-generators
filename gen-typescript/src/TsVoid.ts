import { type GenerateContextType, ContentBase, type GeneratorKey } from '@skmtc/core'

type ConstructorArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
}

export class TsVoid extends ContentBase {
  type = 'void' as const

  constructor({ context, generatorKey }: ConstructorArgs) {
    super({ context, generatorKey })
  }

  override toString(): string {
    return 'void'
  }
}
