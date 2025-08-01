import { ContentBase, type GeneratorKey, type GenerateContext } from '@skmtc/core'

type ConstructorArgs = {
  context: GenerateContext
  generatorKey: GeneratorKey
}

export class ZodUnknown extends ContentBase {
  type = 'unknown' as const

  constructor({ context, generatorKey }: ConstructorArgs) {
    super({ context, generatorKey })
  }

  override toString(): string {
    return `z.unknown()`
  }
}
