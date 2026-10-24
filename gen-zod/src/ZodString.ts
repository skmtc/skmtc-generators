import { TsSnippet } from '@skmtc/lang-typescript'
import type {
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasString,
  Stringable
} from '@skmtc/core'
import { Loop, Maybe, Wrap } from './Maybe.ts'
import { ZodConstraint } from './ZodConstraints.ts'
import { ZodModifiers } from './ZodModifiers.ts'

type ZodStringArgs = {
  context: GenerateContextType
  stringSchema: OasString
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ZodString extends TsSnippet {
  type = 'string' as const
  format: string | undefined
  enums: string[] | (string | null)[] | undefined
  modifiers: Modifiers
  content: Stringable
  constraints: Loop
  modifierCalls: ZodModifiers

  constructor({ context, stringSchema, generatorKey, destinationPath, modifiers }: ZodStringArgs) {
    super({ context, generatorKey, stackTrail: stringSchema.stackTrail.clone() })

    this.enums = stringSchema.enums
    this.format = stringSchema.format
    this.modifiers = modifiers
    this.modifierCalls = new ZodModifiers(modifiers)

    const { enums } = stringSchema
    const literals = new Loop(enums?.map(value => `"${value}"`))

    this.content =
      enums?.length === 1
        ? new Wrap(['z.literal(', literals, ')'])
        : enums
          ? new Wrap(['z.enum([', literals, '])'])
          : 'z.string()'

    // A zero length bound is not rendered (`.min(0)` is a no-op), so `0`
    // counts as absent here.
    this.constraints = new Loop(
      [
        new Maybe(
          stringSchema.minLength || undefined,
          value => new ZodConstraint({ context, name: 'min', value })
        ),
        new Maybe(
          stringSchema.maxLength || undefined,
          value => new ZodConstraint({ context, name: 'max', value })
        )
      ],
      { separator: '' }
    )

    this.register({ imports: { zod: ['z'] }, destinationPath })
  }

  override toString(): string {
    return `${this.content}${this.constraints}${this.modifierCalls}`
  }
}
