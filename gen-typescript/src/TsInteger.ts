import { TsSnippet } from '@skmtc/lang-typescript'
import { applyModifiers } from './applyModifiers.ts'
import type { OasInteger, GeneratorKey, Modifiers, GenerateContextType } from '@skmtc/core'
import { match, P } from 'ts-pattern'

type TsIntegerArgs = {
  context: GenerateContextType
  integerSchema: OasInteger
  modifiers: Modifiers
  generatorKey: GeneratorKey
}

export class TsInteger extends TsSnippet {
  type = 'integer' as const
  modifiers: Modifiers
  format?: 'int32' | 'int64'
  enums?: number[] | (number | null)[]

  constructor({ context, integerSchema, generatorKey, modifiers }: TsIntegerArgs) {
    super({ context, generatorKey, stackTrail: integerSchema.stackTrail.clone() })

    this.format = integerSchema.format
    this.enums = integerSchema.enums
    this.modifiers = modifiers
  }

  override toString(): string {
    const { enums } = this

    // As in TsString: the nullable modifier adds `| null`, so the union
    // lists the numbers. Joined with the `null`, `[1, null]` gave
    // `1 |  | null`, and an empty `enum: []` gave no type at all. Neither
    // parses. An empty list accepts nothing.
    const content = match({ enums })
      .with({ enums: P.array() }, ({ enums }) => {
        const members: Array<number | null> = enums
        const values = members.filter((value): value is number => value !== null)

        return match(values.length)
          .with(0, () => (members.includes(null) ? 'null' : 'never'))
          .otherwise(() => values.join(' | '))
      })
      .otherwise(() => `number`)

    return applyModifiers(content, this.modifiers)
  }
}
