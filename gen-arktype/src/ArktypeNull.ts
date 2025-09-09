import { ContentBase } from '@skmtc/core'
import type { GeneratorKey, GenerateContext } from '@skmtc/core'

type ArktypeNullArgs = {
  context: GenerateContext
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeNull extends ContentBase {
  type = 'null' as const
  
  constructor({ context, generatorKey, destinationPath }: ArktypeNullArgs) {
    super({ context, generatorKey })
    context.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    return 'type("null")'
  }
}