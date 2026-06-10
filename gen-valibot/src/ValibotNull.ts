import { TsSnippet } from '@skmtc/lang-typescript'
import type { GeneratorKey, GenerateContextType } from '@skmtc/core'

type ValibotNullArgs = {
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ValibotNull extends TsSnippet {
  type = 'null' as const

  constructor({ context, generatorKey, destinationPath }: ValibotNullArgs) {
    super({ context, generatorKey })

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    return 'v.null()'
  }
}
