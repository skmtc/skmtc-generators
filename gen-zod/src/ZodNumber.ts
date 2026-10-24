import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasNumber,
  Stringable
} from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { Wrap } from './Maybe.ts'
import { ZodNumericConstraints } from './ZodConstraints.ts'
import { ZodNumericLiterals } from './ZodLiterals.ts'
import { ZodModifiers } from './ZodModifiers.ts'

type ZodNumberArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  schema: OasNumber
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ZodNumber extends TsSnippet {
  type = 'number' as const
  modifiers: Modifiers
  enums?: number[] | (number | null)[]
  content: Stringable
  modifierCalls: ZodModifiers

  constructor({ context, modifiers, schema, destinationPath, generatorKey }: ZodNumberArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers
    this.enums = schema.enums
    this.modifierCalls = new ZodModifiers(modifiers)

    this.content = schema.enums
      ? new ZodNumericLiterals({ enums: schema.enums })
      : new Wrap(['z.number()', new ZodNumericConstraints({ context, schema })])

    this.register({ imports: { zod: ['z'] }, destinationPath })
  }

  override toString(): string {
    return `${this.content}${this.modifierCalls}`
  }
}
