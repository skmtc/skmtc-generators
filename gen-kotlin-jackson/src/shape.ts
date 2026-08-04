import { isEmpty } from '@skmtc/core'
import type {
  GenerateContextType,
  OasObject,
  OasRef,
  OasSchema,
  OasString,
  OasUnion,
  RefName,
} from '@skmtc/core'
import type { KtEntityType } from '@skmtc/lang-kotlin'

type ModelSchema = OasSchema | OasRef<'schema'>

/**
 * Read a component schema WITHOUT the side effect `resolveSchemaRefOnce`
 * carries: that method bumps `context.modelDepth`, the counter the
 * recursion protocol reads, so an identity static calling it would report
 * a cycle that never happened. Identity is computed before construction,
 * so it has to stay side-effect free.
 *
 * A leaf module by design — imported by `base.ts` AND by the projection,
 * it must not close a load-time cycle back through either.
 */
export const peekSchema = (
  context: GenerateContextType,
  refName: RefName,
): ModelSchema | undefined => {
  if (context.document.type !== 'oas') {
    return undefined
  }

  return context.document.value.components?.schemas?.[refName]?.resolveOnce()
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
  if (!('members' in schema)) {
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

    const target = peekSchema(context, member.toRefName())

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
  refName: RefName,
): KtEntityType => {
  const schema = peekSchema(context, refName)

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
