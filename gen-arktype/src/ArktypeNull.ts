import { TsSnippet } from '@skmtc/lang-typescript'
import type { GeneratorKey, GenerateContextType } from '@skmtc/core'

type ArktypeNullArgs = {
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeNull extends TsSnippet {
  type = 'null' as const
  
  constructor({ context, generatorKey, destinationPath }: ArktypeNullArgs) {
    super({ context, generatorKey })
    this.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    return 'type("null")'
  }
}