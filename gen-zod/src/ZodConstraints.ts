import { SnippetBase, type GenerateContextType, type OasInteger, type OasNumber } from '@skmtc/core'
import { Loop, Maybe } from './Maybe.ts'

type ZodConstraintArgs = {
  context: GenerateContextType
  name: string
  value: number
}

/** One constraint call, e.g. `.gte(0)`. Absent keywords never build one. */
export class ZodConstraint extends SnippetBase {
  name: string
  value: number
  constructor({ context, name, value }: ZodConstraintArgs) {
    super({ context })

    this.name = name
    this.value = value
  }

  override toString(): string {
    return `.${this.name}(${this.value})`
  }
}

type ZodNumericConstraintsArgs = {
  context: GenerateContextType
  schema: OasInteger | OasNumber
}

/**
 * The bound constraints shared by integers and numbers: `minimum` /
 * `maximum` (exclusive when the matching flag is set) and `multipleOf`.
 * `0` is a value, so `minimum: 0` renders `.gte(0)`.
 */
export class ZodNumericConstraints {
  constraints: Loop

  constructor({ context, schema }: ZodNumericConstraintsArgs) {
    this.constraints = new Loop(
      [
        new Maybe(
          schema.minimum,
          value =>
            new ZodConstraint({ context, name: schema.exclusiveMinimum ? 'gt' : 'gte', value })
        ),
        new Maybe(
          schema.maximum,
          value =>
            new ZodConstraint({ context, name: schema.exclusiveMaximum ? 'lt' : 'lte', value })
        ),
        new Maybe(
          schema.multipleOf,
          value => new ZodConstraint({ context, name: 'multipleOf', value })
        )
      ],
      { separator: '' }
    )
  }

  toString(): string {
    return `${this.constraints}`
  }
}
