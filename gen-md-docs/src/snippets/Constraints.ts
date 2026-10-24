import type { OasArray, OasInteger, OasNumber, OasObject, OasSchema, OasString } from '@skmtc/core'
import { Loop, Maybe, Nothing, Wrap } from '../Maybe.ts'

const SEPARATOR = { separator: ', ' }

/**
 * The validation constraints of one schema, comma-separated: length and
 * `pattern` for strings, range for numbers, item and property bounds for
 * arrays and objects. Each type has its own class, so every field is read
 * directly from a schema that is known to have it.
 *
 * `toConstraints` is the one place that chooses between them by
 * `schema.type`. A type that has no constraints is `Nothing`. A schema whose
 * constraints are all absent is an empty `Loop`. Either way the parenthetical
 * around it drops out at render.
 *
 * Every resolved schema has a `type`: when a document leaves it out, the
 * parser infers it from `properties`, `items`, `default` or `example`, and
 * otherwise produces `OasUnknown`. The switch is exhaustive, so a new member of
 * `OasSchema` is a type error here rather than silently unconstrained.
 */
export const toConstraints = (schema: OasSchema): Loop | Nothing => {
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
    case 'unknown':
    case 'union':
      return new Nothing()
    default: {
      const unhandled: never = schema
      return unhandled
    }
  }
}

export class StringConstraints extends Loop {
  constructor({ schema }: { schema: OasString }) {
    super(
      [
        new Maybe(schema.minLength, v => new Wrap(['min length: ', v])),
        new Maybe(schema.maxLength, v => new Wrap(['max length: ', v])),
        new Maybe(schema.pattern, v => new Wrap(['pattern: `', v, '`']))
      ],
      SEPARATOR
    )
  }
}

export class NumericConstraints extends Loop {
  constructor({ schema }: { schema: OasInteger | OasNumber }) {
    super(
      [
        new Maybe(
          schema.minimum,
          v =>
            new Wrap([
              'minimum: ',
              v,
              Maybe.when(schema.exclusiveMinimum === true, () => ' (exclusive)')
            ])
        ),
        new Maybe(
          schema.maximum,
          v =>
            new Wrap([
              'maximum: ',
              v,
              Maybe.when(schema.exclusiveMaximum === true, () => ' (exclusive)')
            ])
        ),
        new Maybe(schema.multipleOf, v => new Wrap(['multiple of: ', v]))
      ],
      SEPARATOR
    )
  }
}

export class ArrayConstraints extends Loop {
  constructor({ schema }: { schema: OasArray }) {
    super(
      [
        new Maybe(schema.minItems, v => new Wrap(['min items: ', v])),
        new Maybe(schema.maxItems, v => new Wrap(['max items: ', v])),
        Maybe.when(schema.uniqueItems === true, () => 'unique items')
      ],
      SEPARATOR
    )
  }
}

export class ObjectConstraints extends Loop {
  constructor({ schema }: { schema: OasObject }) {
    super(
      [
        new Maybe(schema.minProperties, v => new Wrap(['min properties: ', v])),
        new Maybe(schema.maxProperties, v => new Wrap(['max properties: ', v]))
      ],
      SEPARATOR
    )
  }
}
