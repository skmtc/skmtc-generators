import { type GenerateContextType, SnippetBase, type GeneratorKey } from '@skmtc/core'

type ConstructorArgs = {
  context: GenerateContextType
  /** Optional attribution (gen-maps) input */
  generatorKey?: GeneratorKey
}

export class TsVoid extends SnippetBase {
  type = 'void' as const

  constructor({ context, generatorKey }: ConstructorArgs) {
    super({ context, generatorKey })
  }

  override toString(): string {
    return 'void'
  }
}
