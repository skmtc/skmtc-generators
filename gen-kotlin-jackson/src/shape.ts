import { isDefaultRefPath, isEmpty, OasObject, toRefPointer } from '@skmtc/core'
import type {
  GenerateContextType,
  OasIntersection,
  OasRef,
  OasSchema,
  OasString,
  OasUnion,
  RefParts,
} from '@skmtc/core'
import type { KtEntityType } from '@skmtc/lang-kotlin'
import { type FlatObject, toFlatObject } from './flatObject.ts'

type ModelSchema = OasSchema | OasRef<'schema'>

/**
 * Read a model's schema straight from the document. Identity is
 * computed before construction, so it reads the schema without going
 * through the context's model machinery.
 *
 * A leaf module by design — imported by `base.ts` AND by the projection,
 * it must not close a load-time cycle back through either.
 */
export const peekSchema = (
  context: GenerateContextType,
  ref: RefParts,
): ModelSchema | undefined => {
  if (context.document.type !== 'oas') {
    return undefined
  }

  // A ref that does not point at a component is kept under its whole pointer.
  const target = isDefaultRefPath({ refPath: ref.refPath, refType: 'schema' })
    ? context.document.value.components?.schemas?.[ref.refName]
    : context.document.value.toRefTarget(toRefPointer(ref))

  if (target?.isRef()) {
    return target.isSchemaRef() ? toObjectForm(target.resolveOnce()) : undefined
  }

  return target?.oasType === 'schema' ? toObjectForm(target.resolveOnce()) : undefined
}

/**
 * An intersection as the one object its members make, as Kotlin has no
 * intersection type. Any other schema as it is, and so is an intersection that
 * is not one object: the router fails on it, and names why.
 */
export const toObjectForm = (schema: ModelSchema): ModelSchema => {
  if (schema.type !== 'intersection') {
    return schema
  }

  const result = toFlatObject(schema)

  return result.type === 'flat' ? toObject(schema, result.flat) : schema
}

/** The object that stands for `intersection`, at its position. */
export const toObject = (intersection: OasIntersection, flat: FlatObject): OasObject => {
  const object = new OasObject({
    ...flat,
    description: intersection.description,
    nullable: intersection.nullable,
  })
  object.stackTrail = intersection.stackTrail

  return object
}

/**
 * An object with properties → `data class Name(…)`.
 *
 * Presence-tested rather than `schema.type === 'object'`: only the router
 * gets to decide what a schema TYPE renders as (`skmtc/single-dispatch`),
 * and what these two guards actually need is the field that carries the
 * declaration's contents.
 */
export const isDataClassSchema = (schema: ModelSchema): schema is OasObject => {
  if (!('properties' in schema)) {
    return false
  }

  const { properties } = schema

  return properties !== undefined && properties !== null && !isEmpty(properties)
}

/** A string with enum members → `enum class Name { … }`. */
export const isEnumClassSchema = (schema: ModelSchema): schema is OasString => {
  if ('properties' in schema || !('enums' in schema) || !schema.enums) {
    return false
  }

  // `enums` also appears on numeric schemas; only STRING members can be an
  // `enum class` whose wire form Jackson reads from `@JsonProperty`.
  const enums: readonly unknown[] = schema.enums

  return enums.length > 0 &&
    enums.every((value) => value === null || typeof value === 'string')
}

/**
 * The sealed-union qualifying predicate (the retired gen-kotlin-kotlinx
 * spec-22 rule, tightened): a union becomes a `sealed interface` iff it is
 * discriminated, has at least two members, every member is a `$ref`, every
 * member's target is an object-with-properties (i.e. dispatches to the
 * data-class shape), and every member keeps at least one parameter AFTER
 * the discriminator property is omitted — `data class X()` is illegal, so
 * a member that is nothing but its tag disqualifies the whole union.
 *
 * Everything that fails stays on the honest wire fallback (`JsonNode`,
 * see `KotlinUnion`). Note core's `OasUnion` merges `oneOf` and `anyOf`,
 * so a discriminated `anyOf` qualifies too — accepted and documented.
 */
export const isSealedUnion = (
  context: GenerateContextType,
  schema: ModelSchema,
): schema is OasUnion => {
  // An intersection has members too, but no discriminator.
  if (!('members' in schema) || !('discriminator' in schema)) {
    return false
  }

  const { discriminator, members } = schema

  if (!discriminator || members.length < 2) {
    return false
  }

  return members.every((member) => {
    if (!member.isRef()) {
      return false
    }

    const target = peekSchema(context, member)

    if (!target || target.isRef() || !isDataClassSchema(target)) {
      return false
    }

    return Object.keys(target.properties ?? {}).some(
      (key) => key !== discriminator.propertyName,
    )
  })
}

/**
 * The shape dispatch — ONE deterministic function, read by both
 * `toIdentifierType` (which decides the declaration head) and
 * `KotlinProjection` (which builds the value that follows it), so the
 * kind and the value can never disagree.
 *
 * Everything else — a bare scalar, an untyped object, a union — becomes a
 * `typealias` over a type expression. That is also what routes an EMPTY
 * object away from `data class Name()`, which Kotlin rejects.
 */
export const toModelShape = (
  context: GenerateContextType,
  ref: RefParts,
): KtEntityType => {
  const schema = peekSchema(context, ref)

  if (!schema) {
    return 'typealias'
  }

  if (isDataClassSchema(schema)) {
    return 'data-class'
  }

  if (isEnumClassSchema(schema)) {
    return 'enum-class'
  }

  if (isSealedUnion(context, schema)) {
    return 'sealed-interface'
  }

  return 'typealias'
}
