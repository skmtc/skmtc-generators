import { SnippetBase } from '@skmtc/core'
import type { GeneratorKey, GenerateContextType } from '@skmtc/core'

type ArktypeNullArgs = {
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeNull extends SnippetBase {
  type = 'null' as const
  
  constructor({ context, generatorKey, destinationPath }: ArktypeNullArgs) {
    super({ context, generatorKey })
    this.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    return 'type("null")'
  }
}