import { ContentBase } from '@skmtc/core'
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

    let content: string
    if (enums && Array.isArray(enums)) {
      content = enums.length === 1
        ? `z.literal("${enums[0]}")`
        : `z.enum([${enums.map(str => `"${str}"`).join(', ')}])`
    } else {
      content = `z.string()`
    }

    return applyModifiers(content, this.modifiers)
  }
}
