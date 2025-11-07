import { ContentBase } from '@skmtc/core'
import { match, P } from 'ts-pattern'
import { applyModifiers } from './applyModifiers.ts'
import type { Modifiers, GeneratorKey, GenerateContextType, OasString } from '@skmtc/core'

type ArktypeStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ArktypeString extends ContentBase {
  type = 'string' as const
  format: string | undefined
  enums: string[] | (string | null)[] | undefined
  modifiers: Modifiers
  
  constructor({ context, stringSchema, generatorKey, destinationPath, modifiers }: ArktypeStringArgs) {
    super({ context, generatorKey })

    this.enums = stringSchema.enums
    this.format = stringSchema.format
    this.modifiers = modifiers

    context.register({ imports: { arktype: ['type'] }, destinationPath })
  }

  override toString(): string {
    const { enums } = this

    const content = match({ enums })
      .with({ enums: P.array() }, matched => {
        return matched.enums.length === 1
          ? `'${matched.enums[0]}'`
          : matched.enums.map(str => `'${str}'`).join(' | ')
      })
      .otherwise(() => 'string')

    return applyModifiers(content, this.modifiers)
  }
}