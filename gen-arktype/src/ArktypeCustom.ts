import type { CustomValue, GenerateContextType, GeneratorKey, Stringable } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'

type ArktypeCustomArgs = {
  context: GenerateContextType
  custom: CustomValue
  generatorKey: GeneratorKey
}

/**
 * Wraps a generator-supplied `CustomValue` so that every value the router
 * returns carries the same fields — a parent reads `stringSyntax` off any child
 * without having to ask what kind of child it is.
 */
export class ArktypeCustom extends TsSnippet {
  type = 'custom' as const
  // Opaque: the value is arbitrary target-language source, so it can only be
  // composed as a value.
  stringSyntax = undefined
  atomicStringSyntax = undefined
  value: Stringable

  constructor({ context, custom, generatorKey }: ArktypeCustomArgs) {
    super({ context, generatorKey })

    this.value = custom.value
  }

  override toString(): string {
    return `${this.value}`
  }
}
