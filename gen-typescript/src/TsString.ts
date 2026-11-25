import { toStringLiteral, TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import { getCustomScalar } from './scalars.ts'
import type { Modifiers, GeneratorKey, GenerateContextType, OasString } from '@skmtc/core'

type TsStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

export class TsString extends TsSnippet {
  type = 'string' as const
  format: string | undefined
  enums: string[] | (string | null)[] | undefined
  modifiers: Modifiers
  constructor({ context, stringSchema, generatorKey, modifiers }: TsStringArgs) {
    super({ context, generatorKey, stackTrail: stringSchema.stackTrail.clone() })

    this.enums = stringSchema.enums
    this.format = stringSchema.format
    this.modifiers = modifiers
  }

  override toString(): string {
    return applyModifiers(toContent(this), this.modifiers)
  }

}

const toContent = ({ enums, format }: Pick<TsString, 'enums' | 'format'>): string => {
  if (Array.isArray(enums)) {
    // Enums always win over scalar format mapping — a string with an
    // explicit enum list has a more specific type than its format.
    // Core lists `null` only on a nullable schema, and the nullable
    // modifier adds `| null`, so the union lists the strings. An empty
    // `enum: []` accepts nothing.
    const members: Array<string | null> = enums
    const values = members.filter((value): value is string => value !== null)

    if (values.length === 0) {
      return members.includes(null) ? 'null' : 'never'
    }

    return values.map(toStringLiteral).join(' | ')
  }

  // Look up the scalar map for the given format. Built-in OpenAPI
  // formats default to `string`; unknown formats (custom GraphQL
  // scalars) default to `unknown` so the user notices and configures.
  return typeof format === 'string' ? (getCustomScalar(format) ?? 'string') : 'string'
}
