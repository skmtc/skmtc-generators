import { isEmpty, toRefName } from '@skmtc/core'
import type { GenerateContextType, OasRef, OasSchema, OasUnion, RefName } from '@skmtc/core'
import { getUnionHint, markInvalidUnionHint } from './unionHints.ts'
import { toEnumValues } from './toEnumEntryName.ts'

/**
 * One sealed parent's claim on a member schema — everything the member's
 * data-class projection needs to render its side of the relationship:
 * the supertype clause (`: Animal`), the wire tag (`@SerialName("dog")`),
 * and the discriminator property to omit from its parameter list.
 */
export type SealedParent = {
  parentRefName: RefName
  /** The member's wire tag under this parent: the `discriminator.mapping`
   * key pointing at the member, else the member's refName (the OpenAPI
   * default). */
  tag: string
  /** `discriminator.propertyName` — the property the member OMITS (the
   * kotlinx class discriminator carries it; a property may not collide). */
  discriminatorPropertyName: string
}

/**
 * The sealed-union qualifying predicate (spec 22, decision 1): a union
 * becomes a Kotlin sealed interface iff it is discriminated, has at
 * least two members, every member is a `$ref`, and every member's
 * target is an object-with-properties — i.e. dispatches to the
 * data-class projection (`toKtProjection` routes object-with-properties
 * there unconditionally, so the shape check IS the dispatch check,
 * without the mutual recursion a literal dispatch call would invite on
 * union-of-union cycles).
 *
 * Everything else keeps the shipped fallback (`typealias = JsonElement`).
 * Note: core's `OasUnion` merges `oneOf` and `anyOf`, so a discriminated
 * `anyOf` qualifies too — accepted and documented.
 */
export const isSealedUnion = (context: GenerateContextType, schema: OasUnion): boolean => {
  const hint = schema.discriminator ? undefined : getUnionHint(context, schema)

  if ((!schema.discriminator && !hint) || schema.members.length < 2) {
    if (hint) {
      markInvalidUnionHint(context, schema, hintFailure(hint.name, 'has fewer than two members'))
    }

    return false
  }

  const qualifies = schema.members.every(member => {
    if (!member.isRef()) {
      return false
    }

    const target = peekRawSchema(context, member.toRefName())

    if (target === undefined || target.isRef() || target.type !== 'object') {
      return false
    }

    if (!target.properties || isEmpty(target.properties)) {
      return false
    }

    // Decision 2 (spec 26): a hinted union's members must CARRY the
    // asserted discriminator property — the schema never declared it,
    // so the claim is verified, not trusted.
    return hint ? target.properties[hint.propertyName] !== undefined : true
  })

  if (!qualifies && hint) {
    markInvalidUnionHint(
      context,
      schema,
      hintFailure(
        hint.name,
        `every member must be a $ref to an object-with-properties carrying '${hint.propertyName}'`
      )
    )
  }

  return qualifies
}

const hintFailure = (name: string, reason: string): string => {
  return `@skmtc/gen-kotlin-kotlinx: union hint '${name}' is invalid — ${reason}`
}

/**
 * The document-wide inversion (spec 22 §2.1): OpenAPI points
 * parent → member; Kotlin declares member → parent
 * (`data class Dog(...) : Animal`). Scans `components.schemas` once,
 * collecting every qualifying union's claims on its members.
 *
 * Memoized per document object via WeakMap — a pure function of the
 * document, so the note-19 dispatch-determinism argument holds, and
 * multiple `toArtifacts` runs in one test process stay isolated without
 * module-state reset ceremony.
 *
 * Membership derives from the DOCUMENT, not the post-`skip`/`include`
 * set — dependency edges are filter-blind (the `insertOperation`
 * precedent). Skipping a qualifying parent while generating its members
 * leaves a dangling `: Parent` that fails the consumer compile loudly.
 */
const membershipCache = new WeakMap<object, Map<RefName, SealedParent[]>>()

export const toSealedMembership = (
  context: GenerateContextType
): Map<RefName, SealedParent[]> => {
  const { document } = context

  const cached = membershipCache.get(document.value)

  if (cached) {
    return cached
  }

  const membership = new Map<RefName, SealedParent[]>()

  if (document.type === 'oas') {
    const schemas = document.value.components?.schemas ?? {}

    for (const [parentRefName, schema] of Object.entries(schemas)) {
      if (schema.isRef()) {
        continue
      }

      if (schema.type === 'union' && isSealedUnion(context, schema)) {
        collectParentClaims(context, parentRefName as RefName, schema, membership)
        continue
      }

      // Inline-hinted unions, one level of `properties.<prop>` (spec 26,
      // decision 1): the enrichment-supplied `name` is the synthesized
      // sealed parent's identity.
      if (schema.type !== 'object' || !schema.properties) {
        continue
      }

      for (const property of Object.values(schema.properties)) {
        if (property.isRef() || property.type !== 'union') {
          continue
        }

        const hint = getUnionHint(context, property)

        if (hint && isSealedUnion(context, property)) {
          collectParentClaims(context, toRefName(hint.name), property, membership)
        }
      }
    }
  }

  membershipCache.set(document.value, membership)

  return membership
}

const collectParentClaims = (
  context: GenerateContextType,
  parentRefName: RefName,
  union: OasUnion,
  membership: Map<RefName, SealedParent[]>
): void => {
  // isSealedUnion guarantees a discriminator OR a valid hint, and
  // all-ref members.
  const hint = union.discriminator ? undefined : getUnionHint(context, union)
  const { propertyName = hint?.propertyName, mapping = {} } = union.discriminator ?? {}

  if (!propertyName) {
    return
  }

  for (const member of union.members) {
    if (!member.isRef()) {
      continue
    }

    const memberRefName = member.toRefName()
    const tag = hint
      ? toHintedMemberTag(context, memberRefName, propertyName)
      : toMemberTag(memberRefName, mapping)

    const claims = membership.get(memberRefName) ?? []

    // Two hint sites may name the SAME synthesized parent (e.g.
    // ListPrice.structure and PriceResponse.structure both hinting
    // 'PricingStructure') — one claim per (parent, tag) pair.
    if (claims.some(claim => claim.parentRefName === parentRefName && claim.tag === tag)) {
      continue
    }

    claims.push({ parentRefName, tag, discriminatorPropertyName: propertyName })
    membership.set(memberRefName, claims)
  }
}

/**
 * The wire tag under a HINT (spec 26, decision 3 — no `mapping` exists
 * by definition): the member's discriminator property resolved to a
 * single-valued string enum → that value (the wire format the schema
 * actually describes, e.g. `GRADUATED`); else the member's refName.
 */
const toHintedMemberTag = (
  context: GenerateContextType,
  memberRefName: RefName,
  propertyName: string
): string => {
  const target = peekRawSchema(context, memberRefName)

  if (target === undefined || target.isRef() || target.type !== 'object') {
    return memberRefName
  }

  const resolved = target.properties?.[propertyName]?.resolveOnce()

  if (resolved && !resolved.isRef() && resolved.type === 'string') {
    const values = toEnumValues(resolved.enums)

    if (values.length === 1) {
      return String(values[0])
    }
  }

  return memberRefName
}

/**
 * The wire tag for one member under one parent: the `mapping` key whose
 * value points at the member — `#/components/schemas/Dog` and bare `Dog`
 * are both accepted — else the member's refName (the OpenAPI default
 * when `mapping` is absent or does not name the member).
 */
const toMemberTag = (memberRefName: RefName, mapping: Record<string, string>): string => {
  for (const [tag, target] of Object.entries(mapping)) {
    const targetRefName = target.includes('/') ? toRefName(target) : target

    if (targetRefName === memberRefName) {
      return tag
    }
  }

  return memberRefName
}

/**
 * Raw (uncounted, single-step) schema lookup — `peekSchema`'s shape
 * minus the not-found throw: the membership scan probes member targets
 * that may legitimately be absent in malformed documents, and a missing
 * target simply disqualifies the union.
 */
const peekRawSchema = (
  context: GenerateContextType,
  refName: RefName
): OasSchema | OasRef<'schema'> | undefined => {
  const { document } = context

  const raw =
    document.type === 'oas'
      ? document.value.components?.schemas?.[refName]
      : document.value.registry.schemas[refName]

  if (!raw) {
    return undefined
  }

  return raw.isRef() ? raw.resolveOnce() : raw
}
