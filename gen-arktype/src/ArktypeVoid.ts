import { ContentBase } from '@skmtc/core'
import type { GeneratorKey, GenerateContext } from '@skmtc/core'

type ArktypeVoidArgs = {
  context: GenerateContext
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeVoid extends ContentBase {
  type = 'void' as const
  
  constructor({ context, generatorKey, destinationPath }: ArktypeVoidArgs) {
    super({ context, generatorKey })
    context.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    return 'type("void")'
  }
}