import {
  SnippetBase,
  type GenerateContextType,
  type OasArray,
  type OasInteger,
  type OasNumber,
  type OasObject,
  type OasString
} from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { InlineCode } from './InlineCode.ts'

type ConstraintArgs = {
  context: GenerateContextType
  label: string
  value: number | InlineCode
}

/** One validation constraint and its value: `min length: 3`, ``pattern: `^[a-z]+$` ``. */
export class Constraint extends SnippetBase {
  label: string
  value: number | InlineCode

  constructor({ context, label, value }: ConstraintArgs) {
    super({ context })

    this.label = label
    this.value = value
  }

  override toString(): string {
    return `${this.label}: ${this.value}`
  }
}

type BoundArgs = {
  context: GenerateContextType
  label: 'minimum' | 'maximum'
  value: number
  /** `exclusiveMinimum` or `exclusiveMaximum` is set. */
  exclusive: boolean
}

/** A numeric bound: `minimum: 0`, or `maximum: 10 (exclusive)`. */
export class Bound extends SnippetBase {
  label: 'minimum' | 'maximum'
  value: number
  exclusive: boolean

  constructor({ context, label, value, exclusive }: BoundArgs) {
    super({ context })

    this.label = label
    this.value = value
    this.exclusive = exclusive
  }

  override toString(): string {
    return this.exclusive ? `${this.label}: ${this.value} (exclusive)` : `${this.label}: ${this.value}`
  }
}

type UniqueItemsArgs = {
  context: GenerateContextType
}

/** `unique items`: the array holds no value twice. */
export class UniqueItems extends SnippetBase {
  constructor({ context }: UniqueItemsArgs) {
    super({ context })
  }

  override toString(): string {
    return 'unique items'
  }
}

/** One entry of {@link Constraints}. */
export type ConstraintItem = Constraint | Bound | UniqueItems

type ConstraintsArgs = {
  context: GenerateContextType
  /** The constraints of the schema's type, in order: `undefined` for one it does not set. */
  values: (ConstraintItem | undefined)[]
  /** The schema's `default`. It is not written when it is `undefined` or `null`. */
  defaultValue: unknown
}

/**
 * The validation constraints a schema carries, then its default, as one
 * group an agent needs to build a valid value: ``(min length: 3, default: `guest`)``.
 * Renders the empty string when there are none.
 */
export class Constraints extends List<ConstraintItem[], ', ', '()'> {
  constructor({ context, values, defaultValue }: ConstraintsArgs) {
    const defaultConstraint =
      defaultValue === undefined || defaultValue === null
        ? undefined
        : new Constraint({
            context,
            label: 'default',
            value: new InlineCode({ context, value: String(defaultValue) })
          })

    super([...values, defaultConstraint], { separator: ', ', bookends: '()', skipEmpty: true })
  }
}

type StringConstraintsArgs = {
  context: GenerateContextType
  schema: OasString
}

/** A string's constraints: its length, its pattern and its default. */
export class StringConstraints extends Constraints {
  constructor({ context, schema }: StringConstraintsArgs) {
    super({
      context,
      values: [
        schema.minLength !== undefined
          ? new Constraint({ context, label: 'min length', value: schema.minLength })
          : undefined,
        schema.maxLength !== undefined
          ? new Constraint({ context, label: 'max length', value: schema.maxLength })
          : undefined,
        schema.pattern !== undefined
          ? new Constraint({ context, label: 'pattern', value: new InlineCode({ context, value: schema.pattern }) })
          : undefined
      ],
      defaultValue: schema.default
    })
  }
}

type NumberConstraintsArgs = {
  context: GenerateContextType
  schema: OasNumber | OasInteger
}

/** A number's or integer's constraints: its bounds, its multiple and its default. */
export class NumberConstraints extends Constraints {
  constructor({ context, schema }: NumberConstraintsArgs) {
    super({
      context,
      values: [
        schema.minimum !== undefined
          ? new Bound({ context, label: 'minimum', value: schema.minimum, exclusive: schema.exclusiveMinimum === true })
          : undefined,
        schema.maximum !== undefined
          ? new Bound({ context, label: 'maximum', value: schema.maximum, exclusive: schema.exclusiveMaximum === true })
          : undefined,
        schema.multipleOf !== undefined
          ? new Constraint({ context, label: 'multiple of', value: schema.multipleOf })
          : undefined
      ],
      defaultValue: schema.default
    })
  }
}

type ArrayConstraintsArgs = {
  context: GenerateContextType
  schema: OasArray
}

/**
 * An array's constraints: its item counts and whether its items are unique.
 * Core keeps an array's default as `defaultValue`, which the docs do not show.
 */
export class ArrayConstraints extends Constraints {
  constructor({ context, schema }: ArrayConstraintsArgs) {
    super({
      context,
      values: [
        schema.minItems !== undefined
          ? new Constraint({ context, label: 'min items', value: schema.minItems })
          : undefined,
        schema.maxItems !== undefined
          ? new Constraint({ context, label: 'max items', value: schema.maxItems })
          : undefined,
        schema.uniqueItems === true ? new UniqueItems({ context }) : undefined
      ],
      defaultValue: undefined
    })
  }
}

type ObjectConstraintsArgs = {
  context: GenerateContextType
  schema: OasObject
}

/** An object's constraints: its property counts and its default. */
export class ObjectConstraints extends Constraints {
  constructor({ context, schema }: ObjectConstraintsArgs) {
    super({
      context,
      values: [
        schema.minProperties !== undefined
          ? new Constraint({ context, label: 'min properties', value: schema.minProperties })
          : undefined,
        schema.maxProperties !== undefined
          ? new Constraint({ context, label: 'max properties', value: schema.maxProperties })
          : undefined
      ],
      defaultValue: schema.default
    })
  }
}
