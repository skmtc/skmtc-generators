import { ContentBase } from '@skmtc/core'
import type { GeneratorKey, GenerateContext } from '@skmtc/core'

type ValibotNullArgs = {
  context: GenerateContext
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ValibotNull extends ContentBase {
  type = 'null' as const

  constructor({ context, generatorKey, destinationPath }: ValibotNullArgs) {
    super({ context, generatorKey })

    context.register({ imports: { valibot: ['v'] }, destinationPath })
  }

  override toString(): string {
    return 'v.null()'
  }
}