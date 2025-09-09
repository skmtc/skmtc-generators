import { ContentBase } from '@skmtc/core'
import type { GeneratorKey, GenerateContext } from '@skmtc/core'

type ArktypeUnknownArgs = {
  context: GenerateContext
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeUnknown extends ContentBase {
  type = 'unknown' as const
  
  constructor({ context, generatorKey, destinationPath }: ArktypeUnknownArgs) {
    super({ context, generatorKey })
    context.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    return 'type("unknown")'
  }
}