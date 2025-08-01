import { type GenerateContext, ContentBase, type GeneratorKey } from '@skmtc/core'

type ConstructorArgs = {
  context: GenerateContext
  generatorKey: GeneratorKey
}

export class ZodVoid extends ContentBase {
  type = 'void' as const

  constructor({ context, generatorKey }: ConstructorArgs) {
    super({ context, generatorKey })
  }

  override toString(): string {
    return `z.void()`
  }
}
