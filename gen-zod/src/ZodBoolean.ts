import type { GenerateContextType, GeneratorKey, Modifiers, OasBoolean } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { ZodModifiers } from './ZodModifiers.ts'

type ZodBooleanArgs = {
  context: GenerateContextType
  modifiers: Modifiers
  /**
   * The parsed boolean schema. Carries `enums` (the boolean values
   * the schema constrains to) so a single-value enum can be emitted
   * as `z.literal(true)` / `z.literal(false)` rather than a wider
   * `z.boolean()`. Without this, discriminated unions on literal
   * booleans lose their narrowing at the consumer's type level —
   * friction #17 in the FieldPlan dogfood log.
   */
  schema: OasBoolean
  destinationPath: string
  generatorKey: GeneratorKey
}

export class ZodBoolean extends TsSnippet {
  type = 'boolean' as const
  modifiers: Modifiers
  enums?: boolean[] | (boolean | null)[]
  content: string
  modifierCalls: ZodModifiers

  constructor({ context, modifiers, schema, destinationPath, generatorKey }: ZodBooleanArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers
    this.enums = schema.enums
    this.modifierCalls = new ZodModifiers(modifiers)

    // Matches the same `length === 1` → `z.literal(...)` shape used by
    // `ZodNumber`, `ZodInteger`, and `ZodString`. Multi-value enums on a
    // boolean (`enum: [true, false]`) carry no extra information vs an
    // unconstrained boolean — fall through to `z.boolean()`.
    this.content = schema.enums?.length === 1 ? `z.literal(${schema.enums[0]})` : 'z.boolean()'

    this.register({ imports: { zod: ['z'] }, destinationPath })
  }

  override toString(): string {
    return `${this.content}${this.modifierCalls}`
  }
}
