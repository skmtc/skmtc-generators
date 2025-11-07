import { ContentBase } from '@skmtc/core'
import { match, P } from 'ts-pattern'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContextType, OasString } from '@skmtc/core'

type ValibotStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ValibotString extends ContentBase {
  type = 'string' as const
  format: string | undefined
  enums: string[] | (string | null)[] | undefined
  modifiers: Modifiers
  constructor({ context, stringSchema, generatorKey, destinationPath, modifiers }: ValibotStringArgs) {
    super({ context, generatorKey })

    this.enums = stringSchema.enums
    this.format = stringSchema.format
    this.modifiers = modifiers

    context.register({ imports: { valibot: ['v'] }, destinationPath })
  }

  override toString(): string {
    const { enums, format } = this

    const content = match({ enums })
      .with({ enums: P.array() }, matched => {
        return matched.enums.length === 1
          ? `v.literal("${matched.enums[0]}")`
          : `v.picklist([${matched.enums.map(str => `"${str}"`).join(', ')}])`
      })
      .otherwise(() => {
        let str = `v.string()`
        if (format === 'date-time') {
          str = `v.pipe(v.string(), v.isoDateTime())`
        }
        return str
      })

    return applyModifiers(content, this.modifiers)
  }
}