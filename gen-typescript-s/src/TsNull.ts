import type { GeneratorKey, GenerateContextType } from '@skmtc/core'
import { SnippetBase } from '@skmtc/core'

type ConstructorArgs = {
  context: GenerateContextType
  /** Optional attribution (gen-maps) input */
  generatorKey?: GeneratorKey
}

export class TsNull extends SnippetBase {
  type = 'null' as const

  constructor({ context, generatorKey }: ConstructorArgs) {
    super({ context, generatorKey })
  }

  override toString(): string {
    return 'null'
  }
}
