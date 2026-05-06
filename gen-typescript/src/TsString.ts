import { ContentBase } from '@skmtc/core'
import { match, P } from 'ts-pattern'
import { applyModifiers } from './applyModifiers.ts'
import { getCustomScalar } from './scalars.ts'
import type { Modifiers, GeneratorKey, GenerateContextType, OasString } from '@skmtc/core'

type TsStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

export class TsString extends ContentBase {
  type = 'string' as const
  format: string | undefined
  enums: string[] | (string | null)[] | undefined
  modifiers: Modifiers
  constructor({ context, stringSchema, generatorKey, modifiers }: TsStringArgs) {
    super({ context, generatorKey })

    this.enums = stringSchema.enums
    this.format = stringSchema.format
    this.modifiers = modifiers
  }

  override toString(): string {
    const { enums, format } = this

    const content = match({ enums, format })
      .with({ enums: P.array() }, matched => {
        // Enums always win over scalar format mapping — a string with an
        // explicit enum list has a more specific type than its format.
        return matched.enums.length === 1
          ? `'${matched.enums[0]}'`
          : `${matched.enums.map(str => `'${str}'`).join(' | ')}`
      })
      .with({ format: P.string }, matched => {
        // Look up the scalar map for the given format. Built-in OpenAPI
        // formats default to `string`; unknown formats (custom GraphQL
        // scalars) default to `unknown` so the user notices and configures.
        return getCustomScalar(matched.format) ?? 'string'
      })
      .otherwise(() => `string`)

    return applyModifiers(content, this.modifiers)
  }
}
