import { TsSnippet } from '@skmtc/lang-typescript'
import type { GeneratorKey, GenerateContextType } from '@skmtc/core'

type ArktypeVoidArgs = {
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeVoid extends TsSnippet {
  type = 'void' as const
  // `void` is not an arktype keyword — `type("void")` fails to parse. An absent
  // value is `undefined`.
  stringSyntax = 'undefined'
  atomicStringSyntax = 'undefined'

  constructor({ context, generatorKey }: ArktypeVoidArgs) {
    super({ context, generatorKey })
  }

  override toString(): string {
    return `"${this.stringSyntax}"`
  }
}
