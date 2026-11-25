// gen-arktype, gen-md-docs, gen-typescript, gen-valibot and gen-zod each have a
// copy of this file, so that a clone of one needs no other. test-support checks
// that the copies are the same.
import { CustomValue, DanglingRefError, OasIntersection, OasObject, OasUnion } from '@skmtc/core'
import type { OasRef, OasSchema, StackTrail } from '@skmtc/core'
import { assertNoMemberLoop } from './memberLoop.ts'

type Member = OasSchema | OasRef<'schema'>
type Property = Member | CustomValue

/** The intersections whose members are being built in the model at hand, by their trail. */
let open = new Set<StackTrail>()

/**
 * Builds a model's value. An intersection that another model holds may be built
 * again in this one, where a reference to that model renders by name.
 */
export const buildModel = <Value>(toValue: () => Value): Value => {
  const outer = open
  open = new Set()

  try {
    return toValue()
  } finally {
    open = outer
  }
}

/** Builds each member with `toValue`, or fails with an error that names the schema. */
export const buildMembers = <Value>(intersection: OasIntersection, toValue: (member: Member) => Value): Value[] => {
  const { stackTrail } = intersection

  assertNoMemberLoop(intersection)

  // `children` of Node holds `allOf: [Node, { required: ['children'] }]`: to
  // write that member's `children` is to write the intersection again.
  if (open.has(stackTrail)) {
    throw new Error(
      `${stackTrail.toSchemaPointer()} cannot be rendered as an intersection: it requires a property of another member that holds the intersection itself.`
    )
  }

  open.add(stackTrail)

  try {
    return toMembers(intersection).map(toValue)
  } finally {
    open.delete(stackTrail)
  }
}

/**
 * The keys that a member requires and no member both declares and requires:
 * `kind`, where a base has `required: ['kind']` and its subtype the property.
 * Each member renders its own keys only, so such a key would stay optional.
 */
export const toUnmetKeys = (intersection: OasIntersection): string[] =>
  toRequired(intersection).filter(key => !intersection.members.some(member => meets(member, key)))

/** Every key that an object of the intersection requires. */
const toRequired = (intersection: OasIntersection): string[] => [
  ...new Set(toObjects(intersection).flatMap(({ required }) => required ?? []))
]

/** Whether a member writes the key as required. An intersection writes its own unmet keys. */
const meets = (member: Member, key: string): boolean => {
  const schema = toTarget(member)

  if (schema instanceof OasIntersection) {
    return toRequired(schema).includes(key) && toDeclared(schema, key) !== undefined
  }

  return schema instanceof OasObject && schema.required?.includes(key) === true && toProperty(schema, key) !== undefined
}

/** What a member is, or `undefined` for a reference that names nothing. */
const toTarget = (member: Member): OasSchema | undefined => {
  try {
    return member.resolve()
  } catch (error) {
    if (DanglingRefError.is(error)) {
      return undefined
    }

    throw error
  }
}

/** The members, with the unmet keys written in the last one that is an object, or in one more. */
const toMembers = (intersection: OasIntersection): Member[] => {
  const added = toUnmetKeys(intersection).flatMap(key => {
    const schema = toDeclared(intersection, key)

    return schema === undefined ? [] : [[key, schema] as const]
  })

  if (added.length === 0) {
    return intersection.members
  }

  const last = intersection.members.findLast(member => member instanceof OasObject)
  const own = last instanceof OasObject ? last : new OasObject({})
  const object = new OasObject({
    nullable: own.nullable,
    properties: { ...own.properties, ...Object.fromEntries(added) },
    required: [...(own.required ?? []), ...added.map(([key]) => key)],
    additionalProperties: own.additionalProperties
  })
  object.stackTrail = last === undefined ? intersection.stackTrail : last.stackTrail

  return last === undefined
    ? [...intersection.members, object]
    : intersection.members.map(member => (member === last ? object : member))
}

const toObjects = (intersection: OasIntersection): OasObject[] =>
  intersection.toParts().filter(part => part instanceof OasObject)

const toProperty = ({ properties }: OasObject, key: string): Property | undefined =>
  properties && Object.hasOwn(properties, key) ? properties[key] : undefined

/** The schema that a member declares for the key, or that each branch of a member that is a union does. */
const toDeclared = (intersection: OasIntersection, key: string): Property | undefined => {
  const declared = toObjects(intersection).flatMap(object => toProperty(object, key) ?? [])

  if (declared.length > 0) {
    return declared[0]
  }

  for (const part of intersection.toParts()) {
    const schemas = part instanceof OasUnion ? toBranchProperties({ union: part, key, seen: new Set() }) : []
    const [first] = schemas

    if (schemas.every(schema => schema === undefined)) {
      continue
    }

    if (first === undefined || schemas.some(schema => schema === undefined || !isSame(first, schema))) {
      throw new Error(
        `${intersection.stackTrail.toSchemaPointer()} cannot be rendered as an intersection: it requires '${key}', which the branches of a union declare differently.`
      )
    }

    return first
  }

  return undefined
}

type ToBranchPropertiesArgs = {
  union: OasUnion
  key: string
  seen: Set<OasSchema>
}

/** What each branch of a union that is an object, or an intersection, declares for the key. */
const toBranchProperties = ({ union, key, seen }: ToBranchPropertiesArgs): (Property | undefined)[] => {
  if (seen.has(union)) {
    return []
  }

  seen.add(union)

  return union.members.flatMap(member => {
    const branch = toTarget(member)

    if (branch instanceof OasUnion) {
      return toBranchProperties({ union: branch, key, seen })
    }

    if (branch instanceof OasIntersection) {
      return [toObjects(branch).flatMap(object => toProperty(object, key) ?? []).at(0)]
    }

    return branch instanceof OasObject ? [toProperty(branch, key)] : []
  })
}

const isSame = (first: Property, second: Property): boolean =>
  first === second ||
  (!(first instanceof CustomValue) &&
    !(second instanceof CustomValue) &&
    JSON.stringify(first.toJsonSchema({ resolve: false })) === JSON.stringify(second.toJsonSchema({ resolve: false })))

/**
 * Whether a member is an object with no keys of its own (`{ minProperties: 1 }`),
 * which TypeScript and zod write as a type that refuses the keys of the other
 * members.
 */
export const hasNoKeys = (member: Member): boolean => {
  const schema = toTarget(member)

  return (
    schema instanceof OasObject &&
    !schema.nullable &&
    Object.keys(schema.properties ?? {}).length === 0 &&
    !schema.additionalProperties
  )
}
