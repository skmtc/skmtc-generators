import { ContentBase } from '@skmtc/core'
import type { GeneratorKey, GenerateContextType } from '@skmtc/core'

type ValibotUnknownArgs = {
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ValibotUnknown extends ContentBase {
  type = 'unknown' as const

  constructor({ context, generatorKey, destinationPath }: ValibotUnknownArgs) {
    super({ context, generatorKey })

    context.register({ imports: { valibot: ['v'] }, destinationPath })
  }

  override toString(): string {
    return 'v.unknown()'
  }
}