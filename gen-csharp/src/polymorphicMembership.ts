import { isEmpty, toRefName } from '@skmtc/core'
import type { GenerateContextType, OasRef, OasSchema, OasUnion, RefName } from '@skmtc/core'
import { getUnionHint, markInvalidUnionHint } from './unionHints.ts'
import { toEnumValues } from './toEnumValues.ts'

/**
 * One polymorphic parent's claim on a member schema — the member-side
 * STRUCTURAL facts the member's record projection needs (the CS-B
 * kernel-#3 correction): the base-type clause (` : Animal`) and the
 * discriminator property to omit from its property list (scratch 6b:
 * a member property matching the discriminator name throws at
 * serializer setup).
 *
 * NO wire tag — the member-side SERIALIZATION claim dissolves in C#:
 * tags live in the parent's `[JsonDerivedType(typeof(Dog), "dog")]`.
 * (Multi-parent claims fail the member loudly — one base record per
 * C# record; the CS-B guard in `CsRecordValue`.)
 */
export type PolymorphicParent = {
  parentRefName: RefName
  /** `discriminator.propertyName` — the property the member OMITS. */
  discriminatorPropertyName: string
}

/**
 * The polymorphic-union qualifying predicate — the Kotlin spec-22
 * decision-1 port WITH the CD3 hint branch (spec-26 port): a union
 * becomes an `abstract partial record` parent iff it is discriminated
 * (or carries a VALID consumer hint), has at least two members, every
 * member is a `$ref`, and every member's target is an
 * object-with-properties. A hinted union's members must additionally
 * CARRY the asserted discriminator property — the schema never
 * declared it, so the claim is verified, not trusted (decision 2); a
 * failed hint is marked invalid and the rendering site fails the item
 * LOUDLY, never a silent `JsonElement` fallback.
 *
 * Everything else keeps the shipped fallback (non-declarable;
 * `JsonElement` at ref sites). Note: core's `OasUnion` merges `oneOf`
 * and `anyOf`, so a discriminated `anyOf` qualifies too.
 */
export const isPolymorphicUnion = (context: GenerateContextType, schema: OasUnion): boolean => {
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
  return `@skmtc/gen-csharp: union hint '${name}' is invalid — ${reason}`
}

/**
 * The document-wide inversion (the spec-22 §2.1 argument, unchanged):
 * OpenAPI points parent → member; C# declares member → parent, and the
 * member's projection runs independently of the parent in arbitrary
 * order — only a document-derived map answers "which parents claim
 * me?" deterministically. Covers discriminated top-level unions,
 * HINTED top-level unions, and hinted INLINE unions one level under
 * `properties.<prop>` (CD3 — the enrichment-supplied `name` is the
 * synthesized parent's identity).
 *
 * Memoized per document object via WeakMap. Membership derives from
 * the DOCUMENT, not the post-`skip`/`include` set — dependency edges
 * are filter-blind.
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
      if (schema.isRef()) {
        continue
      }

      if (schema.type === 'union' && isPolymorphicUnion(context, schema)) {
        collectParentClaims(context, parentRefName as RefName, schema, membership)
        continue
      }

      // Inline-hinted unions, one level of `properties.<prop>` (CD3):
      // the enrichment-supplied `name` is the synthesized parent's
      // identity.
      if (schema.type !== 'object' || !schema.properties) {
        continue
      }

      for (const property of Object.values(schema.properties)) {
        if (property.isRef() || property.type !== 'union') {
          continue
        }

        const hint = getUnionHint(context, property)

        if (hint && isPolymorphicUnion(context, property)) {
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
  membership: Map<RefName, PolymorphicParent[]>
): void => {
  // isPolymorphicUnion guarantees a discriminator OR a valid hint, and
  // all-ref members.
  const hint = union.discriminator ? undefined : getUnionHint(context, union)
  const propertyName = union.discriminator?.propertyName ?? hint?.propertyName

  if (!propertyName) {
    return
  }

  for (const member of union.members) {
    if (!member.isRef()) {
      continue
    }

    const memberRefName = member.toRefName()
    const claims = membership.get(memberRefName) ?? []

    // Two hint sites may name the SAME synthesized parent — one claim
    // per parent.
    if (claims.some(claim => claim.parentRefName === parentRefName)) {
      continue
    }

    claims.push({ parentRefName, discriminatorPropertyName: propertyName })
    membership.set(memberRefName, claims)
  }
}

/**
 * The wire tag for one member under one parent — PARENT-side (rendered
 * into `[JsonDerivedType(typeof(<Member>), "<tag>")]`):
 * `discriminator.mapping`'s key when it names the member (full-ref and
 * bare forms), else — for HINTED unions, which have no `mapping` by
 * definition — the member's single-valued string-enum discriminator
 * property (the wire format the schema actually describes, e.g.
 * `GRADUATED`; the decision-3 port), else the member's refName.
 */
export const toMemberTag = (
  context: GenerateContextType,
  memberRefName: RefName,
  mapping: Record<string, string>,
  hintedPropertyName?: string
): string => {
  for (const [tag, target] of Object.entries(mapping)) {
    const targetRefName = target.includes('/') ? toRefName(target) : target

    if (targetRefName === memberRefName) {
      return tag
    }
  }

  if (hintedPropertyName) {
    const target = peekRawSchema(context, memberRefName)

    if (target && !target.isRef() && target.type === 'object') {
      const resolved = target.properties?.[hintedPropertyName]?.resolveOnce()

      if (resolved && !resolved.isRef() && resolved.type === 'string') {
        const values = toEnumValues(resolved.enums)

        if (values.length === 1) {
          return String(values[0])
        }
      }
    }
  }

  return memberRefName
}

/**
 * Raw (uncounted, single-step) schema lookup — the membership scan
 * probes member targets that may legitimately be absent in malformed
 * documents; a missing target simply disqualifies the union.
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
