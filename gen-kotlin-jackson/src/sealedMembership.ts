import { toRefName } from '@skmtc/core'
import type { GenerateContextType, OasUnion, RefName } from '@skmtc/core'
import { isSealedUnion } from './shape.ts'

/**
 * One sealed parent's claim on a member model — everything the member's
 * data class needs to render its side of the relationship: the supertype
 * clause (`: Pet`, the parent's name derived by the consumer via
 * `context.toModelContentSettings`) and the discriminator property to
 * OMIT from its parameter list (the `@JsonTypeInfo` class discriminator
 * carries the tag on the wire; a declared property would collide with
 * it on serialization).
 *
 * Unlike the retired kotlinx flavor there is NO per-member wire tag
 * here: Jackson's tags are parent-side (`@JsonSubTypes` entries), so a
 * member may legitimately carry different tags under different parents
 * and the kotlinx one-tag-per-class conflict rule does not apply.
 */
export type SealedParent = {
  parentRefName: RefName
  discriminatorPropertyName: string
}

/**
 * The document-wide inversion (retired gen-kotlin-kotlinx spec 22 §2.1):
 * OpenAPI points parent → member (`Pet.oneOf: [Dog, Cat]`); Kotlin
 * declares member → parent (`data class Dog(...) : Pet`). Memoization
 * makes construction order arbitrary — a member's data class may be
 * built before its union is ever seen — so membership must be known
 * BEFORE any construction: one scan over `components.schemas`, memoized
 * per document object via WeakMap (a pure function of the document, so
 * determinism holds and parallel test runs stay isolated).
 *
 * Membership derives from the DOCUMENT, not the post-`skip`/`include`
 * set — dependency edges are filter-blind (the `insertOperation`
 * precedent). Skipping a qualifying parent while generating its members
 * leaves a dangling `: Pet` that fails the consumer compile loudly.
 *
 * Stage-1 scope: top-level union refNames only. An INLINE discriminated
 * union renders the `JsonNode` fallback for now — synthesizing its
 * sealed parent as a named sibling (the `toSynthesizedName` machinery)
 * is the planned stage 2, and needs this scan to deep-walk the document
 * so members are claimed before construction.
 */
const membershipCache = new WeakMap<object, Map<RefName, SealedParent[]>>()

export const toSealedMembership = (
  context: GenerateContextType,
): Map<RefName, SealedParent[]> => {
  const { document } = context

  const cached = membershipCache.get(document.value)

  if (cached) {
    return cached
  }

  const membership = new Map<RefName, SealedParent[]>()

  if (document.type === 'oas') {
    const schemas = document.value.components?.schemas ?? {}

    for (const [key, schema] of Object.entries(schemas)) {
      if (schema.isRef() || !isSealedUnion(context, schema)) {
        continue
      }

      // The key IS a real component refName — parsed, not fabricated.
      collectParentClaims(toRefName(key), schema, membership)
    }
  }

  membershipCache.set(document.value, membership)

  return membership
}

const collectParentClaims = (
  parentRefName: RefName,
  union: OasUnion,
  membership: Map<RefName, SealedParent[]>,
): void => {
  // isSealedUnion guarantees a discriminator and all-ref members; the
  // destructure narrows rather than asserts.
  const { propertyName } = union.discriminator ?? {}

  if (!propertyName) {
    return
  }

  for (const member of union.members) {
    if (!member.isRef()) {
      continue
    }

    const memberRefName = member.toRefName()
    const claims = membership.get(memberRefName) ?? []

    if (claims.some((claim) => claim.parentRefName === parentRefName)) {
      continue
    }

    claims.push({ parentRefName, discriminatorPropertyName: propertyName })
    membership.set(memberRefName, claims)
  }
}

/**
 * The wire tag for one member under one parent: the `discriminator.mapping`
 * key whose value points at the member — `#/components/schemas/Dog` and
 * bare `Dog` are both accepted — else the member's refName (the OpenAPI
 * default when `mapping` is absent or does not name the member).
 */
export const toMemberTag = (
  memberRefName: RefName,
  mapping: Record<string, string>,
): string => {
  for (const [tag, target] of Object.entries(mapping)) {
    const targetRefName = target.includes('/') ? toRefName(target) : target

    if (targetRefName === memberRefName) {
      return tag
    }
  }

  return memberRefName
}
