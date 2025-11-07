import { ContentBase, type GeneratorKey, type GenerateContextType } from '@skmtc/core'

type ConstructorArgs = {
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ZodUnknown extends ContentBase {
  type = 'unknown' as const

  constructor({ context, destinationPath, generatorKey }: ConstructorArgs) {
    super({ context, generatorKey })

    context.register({ imports: { zod: ['z'] }, destinationPath })
  }

  override toString(): string {
    return `z.unknown()`
  }
}
