import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey } from '@skmtc/core'

type ArgAccessArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey | undefined
  name: string
}

const identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/** Reads one property of the function's `args` object: `args.id` or `args['x-id']`. */
export class ArgAccess extends TsSnippet {
  name: string

  constructor({ context, generatorKey, name }: ArgAccessArgs) {
    super({ context, generatorKey })

    this.name = name
  }

  override toString(): string {
    return identifierPattern.test(this.name) ? `args.${this.name}` : `args[${JSON.stringify(this.name)}]`
  }
}
