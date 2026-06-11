import { isEmpty, toRefName } from '@skmtc/core'
import type { GenerateContextType, OasRef, OasSchema, OasUnion, RefName } from '@skmtc/core'

/**
 * One polymorphic parent's claim on a member schema — the member-side
 * STRUCTURAL facts the member's record projection needs (the CS-B
 * kernel-#3 correction): the base-type clause (` : Animal`) and the
 * discriminator property to omit from its property list (scratch 6b:
 * a member property matching the discriminator name throws at
 * serializer setup).
 *
 * NO wire tag — the member-side SERIALIZATION claim dissolves in C#:
 * tags live in the parent's `[JsonDerivedType(typeof(Dog), "dog")]`,
 * so conflicting tags across two parents are a non-issue (each
 * parent's attribute carries its own; Kotlin's conflicting-tag error
 * has no analog here).
 */
export type PolymorphicParent = {
  parentRefName: RefName
  /** `discriminator.propertyName` — the property the member OMITS. */
  discriminatorPropertyName: string
}

/**
 * The polymorphic-union qualifying predicate — the Kotlin spec-22
 * decision-1 port MINUS hint logic (union hints are CS-D): a union
 * becomes an `abstract partial record` parent iff it is discriminated,
 * has at least two members, every member is a `$ref`, and every
 * member's target is an object-with-properties — i.e. dispatches to
 * the record projection, so the shape check IS the dispatch check.
 *
 * Everything else keeps the shipped fallback (non-declarable;
 * `JsonElement` at ref sites). Note: core's `OasUnion` merges `oneOf`
 * and `anyOf`, so a discriminated `anyOf` qualifies too — accepted and
 * documented (the Kotlin precedent).
 */
export const isPolymorphicUnion = (
  context: GenerateContextType,
  schema: OasUnion
): boolean => {
  if (!schema.discriminator || schema.members.length < 2) {
    return false
  }

  return schema.members.every(member => {
    if (!member.isRef()) {
      return false
    }

    const target = peekRawSchema(context, member.toRefName())

    if (target === undefined || target.isRef() || target.type !== 'object') {
      return false
    }

    return target.properties ? !isEmpty(target.properties) : false
  })
}

/**
 * The document-wide inversion (the spec-22 §2.1 argument, unchanged):
 * OpenAPI points parent → member; C# declares member → parent
 * (`record Dog : Animal`), and the member's projection runs
 * independently of the parent in arbitrary order — only a
 * document-derived map answers "which parents claim me?"
 * deterministically.
 *
 * Memoized per document object via WeakMap — a pure function of the
 * document, so dispatch determinism holds and multiple `toArtifacts`
 * runs in one test process stay isolated without module-state reset
 * ceremony. Membership derives from the DOCUMENT, not the
 * post-`skip`/`include` set — dependency edges are filter-blind.
 */
const membershipCache = new WeakMap<object, Map<RefName, PolymorphicParent[]>>()

export const toPolymorphicMembership = (
  context: GenerateContextType
): Map<RefName, PolymorphicParent[]> => {
  const { document } = context

  const cached = membershipCache.get(document.value)

  if (cached) {
    return cached
  }

  const membership = new Map<RefName, PolymorphicParent[]>()

  if (document.type === 'oas') {
    const schemas = document.value.components?.schemas ?? {}

    for (const [parentRefName, schema] of Object.entries(schemas)) {
      if (schema.isRef() || schema.type !== 'union') {
        continue
      }

      if (!isPolymorphicUnion(context, schema)) {
        continue
      }

      const propertyName = schema.discriminator?.propertyName

      if (!propertyName) {
        continue
      }

      for (const member of schema.members) {
        if (!member.isRef()) {
          continue
        }

        const memberRefName = member.toRefName()
        const claims = membership.get(memberRefName) ?? []

        if (claims.some(claim => claim.parentRefName === parentRefName)) {
          continue
        }

        claims.push({
          parentRefName: parentRefName as RefName,
          discriminatorPropertyName: propertyName
        })
        membership.set(memberRefName, claims)
      }
    }
  }

  membershipCache.set(document.value, membership)

  return membership
}

/**
 * The wire tag for one member under one parent — PARENT-side (rendered
 * into `[JsonDerivedType(typeof(Member), "<tag>")]`): the
 * `discriminator.mapping` key whose value points at the member —
 * `#/components/schemas/Dog` and bare `Dog` are both accepted — else
 * the member's refName (the OpenAPI default when `mapping` is absent
 * or does not name the member).
 */
export const toMemberTag = (
  memberRefName: RefName,
  mapping: Record<string, string>
): string => {
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
