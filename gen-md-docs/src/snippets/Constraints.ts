import type {
  OasArray,
  OasBoolean,
  OasInteger,
  OasNumber,
  OasObject,
  OasSchema,
  OasString,
  OasUnion,
  Stringable
} from '@skmtc/core'
import { Group, Loop, Maybe, Nothing } from '@/src/Maybe.ts'

/** The JSON Schema keywords md-docs renders as constraints. */
type ConstraintKeyword =
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'minimum'
  | 'maximum'
  | 'multipleOf'
  | 'minItems'
  | 'maxItems'
  | 'uniqueItems'
  | 'minProperties'
  | 'maxProperties'
  | 'default'

const LABELS: Record<ConstraintKeyword, string> = {
  minLength: 'min length',
  maxLength: 'max length',
  pattern: 'pattern',
  minimum: 'minimum',
  maximum: 'maximum',
  multipleOf: 'multiple of',
  minItems: 'min items',
  maxItems: 'max items',
  uniqueItems: 'unique items',
  minProperties: 'min properties',
  maxProperties: 'max properties',
  default: 'default'
}

const EXCLUSIVE_SUFFIX: Record<`${boolean}`, string> = {
  true: ' (exclusive)',
  false: ''
}

const SEPARATOR = { separator: ', ' }

type ConstraintArgs = {
  keyword: ConstraintKeyword
  value: Stringable
}

type FlagArgs = {
  keyword: ConstraintKeyword
}

type BoundArgs = {
  value: number
  exclusive: boolean
}

type CodeArgs = {
  value: Stringable
}

type StringConstraintsArgs = {
  schema: OasString
}

type NumericConstraintsArgs = {
  schema: OasInteger | OasNumber
}

type ArrayConstraintsArgs = {
  schema: OasArray
}

type ObjectConstraintsArgs = {
  schema: OasObject
}

type BooleanConstraintsArgs = {
  schema: OasBoolean
}

type UnionConstraintsArgs = {
  schema: OasUnion
}

/**
 * The validation constraints of one schema, comma-separated. Each schema type
 * has its own class holding its constraints as data, read directly from a
 * schema the switch has narrowed to that type.
 *
 * This is the one place that dispatches on `schema.type` for constraints. A
 * type with no constraints is `Nothing`. Each class is a `Group`, so one whose
 * constraints are all absent is empty, and the parenthetical around it drops
 * out at render.
 *
 * Every resolved schema has a `type`: when a document leaves it out, the
 * parser infers it from `properties`, `items`, `default` or `example`, and
 * otherwise produces `OasUnknown`. The switch is exhaustive, so a new member of
 * `OasSchema` is a type error here rather than silently unconstrained.
 */
export const toConstraints = (schema: OasSchema): Group | Nothing => {
  switch (schema.type) {
    case 'string':
      return new StringConstraints({ schema })
    case 'integer':
    case 'number':
      return new NumericConstraints({ schema })
    case 'array':
      return new ArrayConstraints({ schema })
    case 'object':
      return new ObjectConstraints({ schema })
    case 'boolean':
      return new BooleanConstraints({ schema })
    case 'union':
      return new UnionConstraints({ schema })
    case 'unknown':
      return new Nothing()
    default: {
      const unhandled: never = schema
      return unhandled
    }
  }
}

/** One constraint keyword and its value: `min length: 3`. */
export class Constraint implements Stringable {
  keyword: ConstraintKeyword
  value: Stringable

  constructor({ keyword, value }: ConstraintArgs) {
    this.keyword = keyword
    this.value = value
  }

  toString(): string {
    return `${LABELS[this.keyword]}: ${this.value}`
  }
}

/** A constraint that is set or not, with no value: `unique items`. */
export class Flag implements Stringable {
  keyword: ConstraintKeyword

  constructor({ keyword }: FlagArgs) {
    this.keyword = keyword
  }

  toString(): string {
    return LABELS[this.keyword]
  }
}

/** A numeric bound, inclusive or exclusive: `3` or `3 (exclusive)`. */
export class Bound implements Stringable {
  value: number
  exclusive: boolean

  constructor({ value, exclusive }: BoundArgs) {
    this.value = value
    this.exclusive = exclusive
  }

  toString(): string {
    return `${this.value}${EXCLUSIVE_SUFFIX[`${this.exclusive}`]}`
  }
}

/** A literal value shown as code: `` `^[a-z]+$` ``. */
export class Code implements Stringable {
  value: Stringable

  constructor({ value }: CodeArgs) {
    this.value = value
  }

  toString(): string {
    return `\`${this.value}\``
  }
}

export class StringConstraints extends Group {
  minLength: Maybe<number, Constraint>
  maxLength: Maybe<number, Constraint>
  pattern: Maybe<string, Constraint>
  default: Maybe<string, Constraint>

  constructor({ schema }: StringConstraintsArgs) {
    super()
    this.minLength = new Maybe(
      schema.minLength,
      value => new Constraint({ keyword: 'minLength', value })
    )
    this.maxLength = new Maybe(
      schema.maxLength,
      value => new Constraint({ keyword: 'maxLength', value })
    )
    this.pattern = new Maybe(
      schema.pattern,
      value => new Constraint({ keyword: 'pattern', value: new Code({ value }) })
    )
    this.default = new Maybe(
      schema.default,
      value => new Constraint({ keyword: 'default', value: new Code({ value }) })
    )
    this.parts = new Loop([this.minLength, this.maxLength, this.pattern, this.default], SEPARATOR)
  }
}

export class NumericConstraints extends Group {
  minimum: Maybe<number, Constraint>
  maximum: Maybe<number, Constraint>
  multipleOf: Maybe<number, Constraint>
  default: Maybe<number, Constraint>

  constructor({ schema }: NumericConstraintsArgs) {
    super()
    this.minimum = new Maybe(
      schema.minimum,
      value =>
        new Constraint({
          keyword: 'minimum',
          value: new Bound({ value, exclusive: schema.exclusiveMinimum === true })
        })
    )
    this.maximum = new Maybe(
      schema.maximum,
      value =>
        new Constraint({
          keyword: 'maximum',
          value: new Bound({ value, exclusive: schema.exclusiveMaximum === true })
        })
    )
    this.multipleOf = new Maybe(
      schema.multipleOf,
      value => new Constraint({ keyword: 'multipleOf', value })
    )
    this.default = new Maybe(
      schema.default,
      value => new Constraint({ keyword: 'default', value: new Code({ value }) })
    )
    this.parts = new Loop([this.minimum, this.maximum, this.multipleOf, this.default], SEPARATOR)
  }
}

export class ArrayConstraints extends Group {
  minItems: Maybe<number, Constraint>
  maxItems: Maybe<number, Constraint>
  uniqueItems: Maybe<true, Flag>

  constructor({ schema }: ArrayConstraintsArgs) {
    super()
    this.minItems = new Maybe(
      schema.minItems,
      value => new Constraint({ keyword: 'minItems', value })
    )
    this.maxItems = new Maybe(
      schema.maxItems,
      value => new Constraint({ keyword: 'maxItems', value })
    )
    this.uniqueItems = Maybe.when(
      schema.uniqueItems === true,
      () => new Flag({ keyword: 'uniqueItems' })
    )
    this.parts = new Loop([this.minItems, this.maxItems, this.uniqueItems], SEPARATOR)
  }
}

export class ObjectConstraints extends Group {
  minProperties: Maybe<number, Constraint>
  maxProperties: Maybe<number, Constraint>
  default: Maybe<Record<string, unknown>, Constraint>

  constructor({ schema }: ObjectConstraintsArgs) {
    super()
    this.minProperties = new Maybe(
      schema.minProperties,
      value => new Constraint({ keyword: 'minProperties', value })
    )
    this.maxProperties = new Maybe(
      schema.maxProperties,
      value => new Constraint({ keyword: 'maxProperties', value })
    )
    this.default = new Maybe(
      schema.default,
      value => new Constraint({ keyword: 'default', value: new Code({ value }) })
    )
    this.parts = new Loop([this.minProperties, this.maxProperties, this.default], SEPARATOR)
  }
}

export class BooleanConstraints extends Group {
  default: Maybe<boolean, Constraint>

  constructor({ schema }: BooleanConstraintsArgs) {
    super()
    this.default = new Maybe(
      schema.default,
      value => new Constraint({ keyword: 'default', value: new Code({ value }) })
    )
    this.parts = this.default
  }
}

export class UnionConstraints extends Group {
  default: Maybe<unknown, Constraint>

  constructor({ schema }: UnionConstraintsArgs) {
    super()
    this.default = new Maybe(
      schema.default,
      value => new Constraint({ keyword: 'default', value: new Code({ value }) })
    )
    this.parts = this.default
  }
}
