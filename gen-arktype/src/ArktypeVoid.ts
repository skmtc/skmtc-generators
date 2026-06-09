import { TypescriptSnippet } from '@skmtc/lang-typescript'
import type { GeneratorKey, GenerateContextType } from '@skmtc/core'

type ArktypeVoidArgs = {
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeVoid extends TypescriptSnippet {
  type = 'void' as const
  
  constructor({ context, generatorKey, destinationPath }: ArktypeVoidArgs) {
    super({ context, generatorKey })
    this.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    return 'type("void")'
  }
}