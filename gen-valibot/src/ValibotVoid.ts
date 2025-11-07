import { ContentBase } from '@skmtc/core'
import type { GeneratorKey, GenerateContextType } from '@skmtc/core'

type ValibotVoidArgs = {
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ValibotVoid extends ContentBase {
  type = 'void' as const

  constructor({ context, generatorKey, destinationPath }: ValibotVoidArgs) {
    super({ context, generatorKey })

    context.register({ imports: { valibot: ['v'] }, destinationPath })
  }

  override toString(): string {
    return 'v.undefined()'
  }
}