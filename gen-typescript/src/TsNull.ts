import type { GeneratorKey, GenerateContextType } from '@skmtc/core'
import { ContentBase } from '@skmtc/core'

type ConstructorArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
}

export class TsNull extends ContentBase {
  type = 'null' as const

  constructor({ context, generatorKey }: ConstructorArgs) {
    super({ context, generatorKey })
  }

  override toString(): string {
    return 'null'
  }
}
