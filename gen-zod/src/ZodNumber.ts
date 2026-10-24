import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasNumber,
  Stringable
} from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { Maybe, Wrap } from '@/src/Maybe.ts'
import { ZodNumericConstraints } from '@/src/ZodConstraints.ts'
import { ZodNumericLiterals } from '@/src/ZodLiterals.ts'
import { ZodModifiers } from '@/src/ZodModifiers.ts'

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

    this.content = new Maybe(
      schema.enums,
      enums => new ZodNumericLiterals({ enums }),
      () => new Wrap(['z.number()', new ZodNumericConstraints({ context, schema })])
    )

    this.register({ imports: { zod: ['z'] }, destinationPath })
  }

  override toString(): string {
    return `${this.content}${this.modifierCalls}`
  }
}
