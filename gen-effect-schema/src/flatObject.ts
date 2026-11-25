// gen-effect-schema and gen-kotlin-jackson each have a copy of this file, so that
// a clone of one needs no other. test-support checks that the copies are the same.
// deno-lint-ignore-file skmtc/single-dispatch -- it answers what the members say together; it decides no output, which is the router's
import { DanglingRefError } from '@skmtc/core'
import type { CustomValue, OasIntersection, OasObject, OasRef, OasSchema } from '@skmtc/core'

type PropertySchema = OasSchema | OasRef<'schema'> | CustomValue

/** The keywords of one object that says what every member of an intersection says. */
export type FlatObject = {
  properties: Record<string, PropertySchema>
  required: string[]
  additionalProperties: OasObject['additionalProperties']
}

export type FlatResult =
  | { type: 'flat'; flat: FlatObject }
  /** Why the members are not one object, after "… cannot be one object: ". */
  | { type: 'failed'; reason: string }

/**
 * The members of an intersection as one object, with the references followed.
 * `additionalProperties: false` is left out: it closes one member, and the
 * other members add properties to it.
 */
export const toFlatObject = (schema: OasIntersection): FlatResult => toFlat(schema, [])

/** What one member of an intersection adds to the object: see {@link toFlatObject}. */
export const toFlatMember = (member: OasSchema | OasRef<'schema'>): FlatResult => toFlat(member, [])

/** {@link toFlatObject}, or an error that names the schema. */
export const toFlatObjectOrThrow = (schema: OasIntersection): FlatObject => {
  const result = toFlatObject(schema)

  if (result.type === 'failed') {
    throw new Error(`${schema.stackTrail.toSchemaPointer()} is an intersection that cannot be one object: ${result.reason}`)
  }

  return result.flat
}

const toFlat = (schema: OasSchema | OasRef<'schema'>, path: string[]): FlatResult => {
  if (schema.isRef()) {
    const target = path.includes(schema.$ref) ? undefined : toTarget(schema)

    return target === undefined
      ? { type: 'failed', reason: `${schema.$ref} leads back to itself or names nothing` }
      : toFlat(target, [...path, schema.$ref])
  }

  if (schema.type === 'intersection') {
    return schema.members
      .map(member => toFlat(member, path))
      .reduce(mergeResults, { type: 'flat', flat: { properties: {}, required: [], additionalProperties: undefined } })
  }

  if (schema.type === 'object') {
    const { properties, required, additionalProperties } = schema

    return {
      type: 'flat',
      flat: {
        properties: properties ?? {},
        required: required ?? [],
        additionalProperties: additionalProperties || undefined
      }
    }
  }

  // Any value (`{ description }`) adds nothing.
  if (schema.type === 'unknown') {
    return { type: 'flat', flat: { properties: {}, required: [], additionalProperties: undefined } }
  }

  return {
    type: 'failed',
    reason: `its member ${schema.stackTrail.toSchemaPointer()} is of type ${schema.type}, not an object`
  }
}

/** What a reference names, with the keywords next to it, or `undefined` when it names nothing. */
const toTarget = (ref: OasRef<'schema'>): OasSchema | undefined => {
  try {
    return ref.resolve()
  } catch (error) {
    if (DanglingRefError.is(error)) {
      return undefined
    }

    throw error
  }
}

const mergeResults = (first: FlatResult, second: FlatResult): FlatResult => {
  if (first.type === 'failed') {
    return first
  }

  return second.type === 'failed' ? second : mergeFlat(first.flat, second.flat)
}

const mergeFlat = (first: FlatObject, second: FlatObject): FlatResult => {
  const properties: Record<string, PropertySchema> = { ...first.properties }

  for (const [key, schema] of Object.entries(second.properties)) {
    const merged = key in properties ? toNarrower(properties[key], schema) : schema

    if (merged === undefined) {
      return { type: 'failed', reason: `two members have a property '${key}', of two different schemas` }
    }

    properties[key] = merged
  }

  const additionalProperties = toNarrowerRecord(first.additionalProperties, second.additionalProperties)

  return additionalProperties.type === 'failed'
    ? additionalProperties
    : {
        type: 'flat',
        flat: {
          properties,
          required: [...new Set([...first.required, ...second.required])],
          additionalProperties: additionalProperties.record
        }
      }
}

type AdditionalProperties = OasObject['additionalProperties']

const toNarrowerRecord = (
  first: AdditionalProperties,
  second: AdditionalProperties
): { type: 'record'; record: AdditionalProperties } | { type: 'failed'; reason: string } => {
  // `true` and a missing keyword allow any value.
  if (typeof first !== 'object' || typeof second !== 'object') {
    return { type: 'record', record: typeof first === 'object' ? first : second ?? first }
  }

  return isSame(first, second)
    ? { type: 'record', record: second }
    : { type: 'failed', reason: 'two members have additionalProperties, of two different schemas' }
}

/** The one of two schemas that allows only what the other allows too, or `undefined`. */
const toNarrower = (first: PropertySchema, second: PropertySchema): PropertySchema | undefined => {
  if (first.type === 'unknown' || isSame(first, second)) {
    return second
  }

  if (second.type === 'unknown' || isStringEnumOf(first, second)) {
    return first
  }

  return isStringEnumOf(second, first) ? second : undefined
}

/** Whether `schema` lists the values of a string, and `base` is any string. */
const isStringEnumOf = (schema: PropertySchema, base: PropertySchema): boolean =>
  schema.type === 'string' &&
  base.type === 'string' &&
  schema.enums !== undefined &&
  base.enums === undefined &&
  (!schema.nullable || base.nullable === true)

const isSame = (first: PropertySchema, second: PropertySchema): boolean =>
  first === second ||
  (first.type !== 'custom' &&
    second.type !== 'custom' &&
    JSON.stringify(toRules(first)) === JSON.stringify(toRules(second)))

/** A schema as JSON, without the keywords that only describe it. */
const toRules = (schema: OasSchema | OasRef<'schema'>): Record<string, unknown> => {
  const {
    title: _title,
    description: _description,
    example: _example,
    default: _default,
    deprecated: _deprecated,
    ...rules
  }: Record<string, unknown> = { ...schema.toJsonSchema({ resolve: false }) }

  return rules
}
