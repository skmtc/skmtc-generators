import { ContentBase } from '@skmtc/core'
import { match, P } from 'ts-pattern'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContextType, OasString } from '@skmtc/core'

type ZodStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ZodString extends ContentBase {
  type = 'string' as const
  format: string | undefined
  enums: string[] | (string | null)[] | undefined
  modifiers: Modifiers
  constructor({ context, stringSchema, generatorKey, destinationPath, modifiers }: ZodStringArgs) {
    super({ context, generatorKey })

    this.enums = stringSchema.enums
    this.format = stringSchema.format
    this.modifiers = modifiers

    context.register({ imports: { zod: ['z'] }, destinationPath })
  }

  override toString(): string {
    const { enums } = this

    const content = match({ enums })
      .with({ enums: P.array() }, matched => {
        return matched.enums.length === 1
          ? `z.literal("${matched.enums[0]}")`
          : `z.enum([${matched.enums.map(str => `"${str}"`).join(', ')}])`
      })
      .otherwise(() => {
        return `z.string()`
      })

    return applyModifiers(content, this.modifiers)
  }
}
