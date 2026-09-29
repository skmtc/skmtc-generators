import { isIdentifierName } from '@babel/helper-validator-identifier'
import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey } from '@skmtc/core'

type ArgAccessArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey | undefined
  name: string
}

/**
 * Reads one property of the function's `args` object: `args.id` or
 * `args["x-id"]`. Not lang-typescript's `handlePropertyName`, which quotes the
 * key without escaping it.
 */
export class ArgAccess extends TsSnippet {
  name: string

  constructor({ context, generatorKey, name }: ArgAccessArgs) {
    super({ context, generatorKey })

    this.name = name
  }

  override toString(): string {
    return isIdentifierName(this.name) ? `args.${this.name}` : `args[${JSON.stringify(this.name)}]`
  }
}
