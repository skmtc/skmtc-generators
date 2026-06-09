import { TypescriptSnippet } from '@skmtc/lang-typescript'
import type { GeneratorKey, GenerateContextType } from '@skmtc/core'

type ValibotVoidArgs = {
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ValibotVoid extends TypescriptSnippet {
  type = 'void' as const

  constructor({ context, generatorKey, destinationPath }: ValibotVoidArgs) {
    super({ context, generatorKey })

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    return 'v.undefined()'
  }
}
