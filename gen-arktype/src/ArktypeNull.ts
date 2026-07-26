import { TsSnippet } from '@skmtc/lang-typescript'
import type { GeneratorKey, GenerateContextType } from '@skmtc/core'

type ArktypeNullArgs = {
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
}

/**
 * Unreachable from the router: core's schema union has no `null` type, so
 * nullability arrives as `modifiers.nullable` instead. Kept because it is part
 * of the package's public surface.
 */
export class ArktypeNull extends TsSnippet {
  type = 'null' as const
  stringSyntax = 'null'
  atomicStringSyntax = 'null'

  constructor({ context, generatorKey }: ArktypeNullArgs) {
    super({ context, generatorKey })
  }

  override toString(): string {
    return `"${this.stringSyntax}"`
  }
}
