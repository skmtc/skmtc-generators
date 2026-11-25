// gen-effect-schema and gen-kotlin-jackson each have a copy of this file, so that
// a clone of one needs no other. test-support checks that the copies are the same.
// deno-lint-ignore-file skmtc/single-dispatch -- it compares two schemas; it decides no output, which is the router's
import { DanglingRefError } from '@skmtc/core'
import type { CustomValue, OasObject, OasRef, OasSchema } from '@skmtc/core'

type PropertySchema = OasSchema | OasRef<'schema'> | CustomValue

/**
 * The one of two schemas that has every rule of the other, so that a value it
 * allows is one that both allow, or `undefined`. Of two that say the same, the
 * second. A default that only the other one has goes with it.
 */
export const toNarrower = (first: PropertySchema, second: PropertySchema): PropertySchema | undefined => {
  if (first.type === 'custom' || second.type === 'custom') {
    return first === second ? second : undefined
  }

  if (isWithin(second, first, new Map())) {
    return withDefault(second, first)
  }

  return isWithin(first, second, new Map()) ? withDefault(first, second) : undefined
}

/** `schema` with the default of `other`, when it has none and does not list values without it. */
const withDefault = (
  schema: OasSchema | OasRef<'schema'>,
  other: OasSchema | OasRef<'schema'>
): OasSchema | OasRef<'schema'> => {
  const from = toSchema(other)

  // A reference keeps its name. Its model has its own default.
  if (from === undefined || schema.isRef()) {
    return schema
  }

  const copy = schema.clone()

  for (const key of ['default', 'defaultValue']) {
    const value: unknown = Reflect.get(from, key)
    const enums: unknown = Reflect.get(schema, 'enums')

    if (
      value !== undefined && Reflect.get(schema, key) === undefined &&
      (!Array.isArray(enums) || enums.includes(value))
    ) {
      Reflect.set(copy, key, value)

      return copy
    }
  }

  return schema
}

/** Whether the inner schema is within the outer one, by the outer one. */
type Pairs = Map<OasSchema, Map<OasSchema, boolean>>

/** Whether each value that `schema` allows is one that `base` allows, as far as their rules say. */
const isWithin = (
  schema: OasSchema | OasRef<'schema'>,
  base: OasSchema | OasRef<'schema'>,
  /** The pairs compared. A pair met again inside itself holds if the rest does. */
  pairs: Pairs
): boolean => {
  if (schema === base) {
    return true
  }

  const inner = toSchema(schema)
  const outer = toSchema(base)

  if (inner === undefined || outer === undefined) {
    return false
  }

  if (inner === outer) {
    return true
  }

  const inners = pairs.get(outer) ?? new Map<OasSchema, boolean>()
  const known = inners.get(inner)

  if (known !== undefined) {
    return known
  }

  pairs.set(outer, inners)
  inners.set(inner, true)

  const result = hasRulesOf(inner, outer, pairs)
  inners.set(inner, result)

  return result
}

/** The schema at a site, or `undefined` for a reference that names nothing. */
const toSchema = (schema: OasSchema | OasRef<'schema'>): OasSchema | undefined => {
  try {
    return schema.resolve()
  } catch (error) {
    if (DanglingRefError.is(error)) {
      return undefined
    }

    throw error
  }
}

const hasRulesOf = (schema: OasSchema, base: OasSchema, pairs: Pairs): boolean => {
  if (base.type === 'unknown') {
    return true
  }

  if (schema.nullable && !base.nullable) {
    return false
  }

  if (schema.type === 'union') {
    return schema.members.every(member => isWithin(member, base, pairs))
  }

  if (base.type === 'union') {
    return base.members.some(member => isWithin(schema, member, pairs))
  }

  if (schema.type === 'intersection' || base.type === 'intersection') {
    return (
      schema.type === 'intersection' &&
      base.type === 'intersection' &&
      schema.members.length === base.members.length &&
      schema.members.every((member, index) => isWithin(member, base.members[index], pairs))
    )
  }

  // An integer is a number.
  if (schema.type !== base.type && !(schema.type === 'integer' && base.type === 'number')) {
    return false
  }

  if (!hasLimitsOf(schema, base)) {
    return false
  }

  if (schema.type === 'array' && base.type === 'array') {
    return isWithin(schema.items, base.items, pairs)
  }

  return schema.type !== 'object' || base.type !== 'object' || hasKeysOf(schema, base, pairs)
}

const hasKeysOf = (schema: OasObject, base: OasObject, pairs: Pairs): boolean => {
  const own = schema.properties ?? {}
  const keys = Object.entries(base.properties ?? {})

  const hasProperties = keys.every(([key, property]) => {
    const ownProperty = Object.hasOwn(own, key) ? own[key] : undefined

    if (ownProperty === undefined || ownProperty.type === 'custom' || property.type === 'custom') {
      return ownProperty === property
    }

    return isWithin(ownProperty, property, pairs)
  })

  const hasRequired = (base.required ?? []).every(key => schema.required?.includes(key))

  return hasProperties && hasRequired && hasRecordOf(schema, base, pairs)
}

const hasRecordOf = (schema: OasObject, base: OasObject, pairs: Pairs): boolean => {
  const record = base.additionalProperties

  if (record === undefined || record === true) {
    return true
  }

  if (record === false) {
    return (
      schema.additionalProperties === false &&
      Object.keys(schema.properties ?? {}).every(key => Object.hasOwn(base.properties ?? {}, key))
    )
  }

  return (
    schema.additionalProperties === false ||
    (typeof schema.additionalProperties === 'object' && isWithin(schema.additionalProperties, record, pairs))
  )
}

const AT_LEAST = ['minimum', 'minLength', 'minItems', 'minProperties']
const AT_MOST = ['maximum', 'maxLength', 'maxItems', 'maxProperties']
const EQUAL = ['pattern', 'format', 'multipleOf', 'uniqueItems']

/** Whether a schema has each limit that the other, of the same type, puts on a value. */
const hasLimitsOf = (schema: OasSchema, base: OasSchema): boolean => {
  const own = (key: string): unknown => Reflect.get(schema, key)
  const other = (key: string): unknown => Reflect.get(base, key)

  const enums = own('enums')
  const otherEnums = other('enums')

  if (Array.isArray(otherEnums)) {
    // `null` is in the list of a nullable one, which is compared above.
    return Array.isArray(enums) && enums.every(value => value === null || otherEnums.includes(value))
  }

  // The values are listed, so the limits of a string add nothing to its type.
  if (Array.isArray(enums) && schema.type === 'string') {
    return true
  }

  const isBeyond = (key: string, isInside: (value: number, limit: number) => boolean): boolean => {
    const limit = other(key)
    const value = own(key)

    return typeof limit === 'number' && !(typeof value === 'number' && isInside(value, limit))
  }

  return (
    !AT_LEAST.some(key => isBeyond(key, (value, limit) => value >= limit)) &&
    !AT_MOST.some(key => isBeyond(key, (value, limit) => value <= limit)) &&
    EQUAL.every(key => other(key) === undefined || other(key) === false || other(key) === own(key)) &&
    hasExclusiveLimit('exclusiveMinimum', 'minimum') &&
    hasExclusiveLimit('exclusiveMaximum', 'maximum')
  )

  function hasExclusiveLimit(flag: string, key: string): boolean {
    return other(flag) !== true || own(flag) === true || own(key) !== other(key)
  }
}
