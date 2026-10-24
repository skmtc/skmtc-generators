import { TsSnippet } from '@skmtc/lang-typescript'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasInteger,
  Stringable
} from '@skmtc/core'
import { Wrap } from './Maybe.ts'
import { ZodNumericConstraints } from './ZodConstraints.ts'
import { ZodNumericLiterals } from './ZodLiterals.ts'
import { ZodModifiers } from './ZodModifiers.ts'

type ZodIntegerArgs = {
  context: GenerateContextType
  schema: OasInteger
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ZodInteger extends TsSnippet {
  type = 'integer' as const
  modifiers: Modifiers
  format?: 'int32' | 'int64'
  enums?: number[] | (number | null)[]
  content: Stringable
  modifierCalls: ZodModifiers

  constructor({ context, schema, modifiers, destinationPath, generatorKey }: ZodIntegerArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.format = schema.format
    this.enums = schema.enums
    this.modifiers = modifiers
    this.modifierCalls = new ZodModifiers(modifiers)

    this.content = schema.enums
      ? new ZodNumericLiterals({ enums: schema.enums })
      : new Wrap(['z.number().int()', new ZodNumericConstraints({ context, schema })])

    this.register({ imports: { zod: ['z'] }, destinationPath })
  }

  override toString(): string {
    return `${this.content}${this.modifierCalls}`
  }
}
