import { fromModelKey, isDefaultRefPath, toModelKey, toRefParts, toRefPointer } from '@skmtc/core'
import type {
  CustomValue,
  GenerateContextType,
  OasMediaType,
  OasParameter,
  OasRequestBody,
  OasResponse,
  OasSchema,
  OasRef,
  OasUnion,
  RefParts,
} from '@skmtc/core'
import { isSealedUnion } from './shape.ts'
import { toSynthesizedNameOrNull } from './toSynthesizedName.ts'

/**
 * The identity of a claiming sealed parent. A TOP-LEVEL union is a
 * component — the claim carries its real `RefName` and the consumer
 * derives the display name through the sanctioned identity door
 * (`context.toModelContentSettings`). An INLINE union has no refName —
 * the claim carries the union NODE itself: a member consuming the claim
 * must be able to `ensureSealedParent` the declaration into existence,
 * because nothing guarantees any walk ever reaches an
 * operation-position union (this generator may run without an operation
 * generator beside it) — whoever needs the name first declares it,
 * arbitrated by the claim registry.
 *
 * Deliberately NO name field: `toSynthesizedName` throws on a trail it
 * cannot derive (the loud per-subject rule), and this scan runs inside
 * every model's construction — deriving eagerly here would turn one
 * underivable union into a whole-document failure. Underivable unions
 * are instead SKIPPED at claim time (`toSynthesizedNameOrNull` — the
 * derivability answer every site shares), consumers derive the name
 * lazily, and identity inside the scan keys on the TRAIL.
 */
export type SealedParentIdentity =
  | { type: 'component'; ref: RefParts }
  | { type: 'synthesized'; union: OasUnion }

/**
 * One sealed parent's claim on a member model — everything the member's
 * data class needs to render its side of the relationship: the supertype
 * clause (`: Pet`) and the discriminator property to OMIT from its
 * parameter list (the `@JsonTypeInfo` class discriminator carries the
 * tag on the wire; a declared property would collide with it on
 * serialization).
 *
 * Unlike the retired kotlinx flavor there is NO per-member wire tag
 * here: Jackson's tags are parent-side (`@JsonSubTypes` entries), so a
 * member may legitimately carry different tags under different parents
 * and the kotlinx one-tag-per-class conflict rule does not apply.
 */
export type SealedParent = {
  parent: SealedParentIdentity
  discriminatorPropertyName: string
}

/**
 * The document-wide inversion (retired gen-kotlin-kotlinx spec 22 §2.1):
 * OpenAPI points parent → member (`Pet.oneOf: [Dog, Cat]`); Kotlin
 * declares member → parent (`data class Dog(...) : Pet`). Memoization
 * makes construction order arbitrary — a member's data class may be
 * built before its union is ever seen — so membership must be known
 * BEFORE any construction: one scan, memoized per document object via
 * WeakMap (a pure function of the document, so determinism holds and
 * parallel test runs stay isolated).
 *
 * The scan DEEP-WALKS every component subtree AND the full request
 * surface of every operation-shaped subject — `document.value.operations`
 * and `document.value.webhooks` (core keeps them in SEPARATE arrays),
 * each contributing parameters (both the direct `schema` and the
 * `content` media-type alternative), request bodies, responses, and
 * response headers (again schema OR `content`) — because a qualifying
 * union can sit inline at any of those positions and its members still
 * need their supertype clause. A ref to a component is not followed: every
 * component is walked from its own root, so following it would only
 * double-visit (or loop). Any other ref's target is walked once.
 *
 * NOT covered, and not coverable here: parameters declared at the PATH
 * ITEM level rather than on the operation. Core parses those onto
 * `OasPathItem.parameters` and never merges them into the operation, so
 * `OasOperation.toParams()` does not see them either — they are outside
 * every generator's reach, not just this scan's. A union there is
 * absent from the output rather than mis-declared.
 *
 * Membership derives from the DOCUMENT, not the post-`skip`/`include`
 * set — dependency edges are filter-blind (the `insertOperation`
 * precedent). Skipping a qualifying parent while generating its members
 * leaves a dangling `: Pet` that fails the consumer compile loudly.
 */
/** Claims by the member's `toModelKey`, so two targets that share a `refName` stay apart. */
const membershipCache = new WeakMap<object, Map<string, SealedParent[]>>()

export const toSealedMembership = (
  context: GenerateContextType,
): Map<string, SealedParent[]> => {
  const { document } = context

  const cached = membershipCache.get(document.value)

  if (cached) {
    return cached
  }

  const membership = new Map<string, SealedParent[]>()

  if (document.type === 'oas') {
    const seen = new Set<OasSchema>()

    const visitedTargets = new Set<string>()

    // A ref that does not point at a component: its target is a model of its
    // own, which no component's walk reaches as one (and a `$defs` entry no
    // walk reaches at all).
    const visitRef = (ref: OasRef<'schema'>): void => {
      const pointer = toRefPointer(ref)

      if (isDefaultRefPath({ refPath: ref.refPath, refType: 'schema' }) || visitedTargets.has(pointer)) {
        return
      }

      visitedTargets.add(pointer)

      const target = document.value.toRefTarget(pointer)

      if (target?.isRef()) {
        if (target.isSchemaRef()) {
          visitRef(target)
        }
        return
      }

      if (target?.oasType !== 'schema') {
        return
      }

      if (isSealedUnion(context, target)) {
        collectParentClaims(
          { type: 'component', ref: { refName: ref.refName, refPath: ref.refPath } },
          target,
          membership,
        )
      }

      walkSchema(target, seen, visitInline)
    }

    const visitInline = (node: OasSchema | OasRef<'schema'>): void => {
      if (node.isRef()) {
        visitRef(node)
        return
      }

      // Claim only what can be NAMED: an underivable trail (a root
      // `toSynthesizedNameOrNull` does not know) is skipped, so its
      // members render without a clause and the union render site falls
      // back to `JsonNode` — the same shared derivability answer at
      // every site, degrading consistently instead of one site
      // declaring what another cannot name.
      if (isSealedUnion(context, node) && toSynthesizedNameOrNull(context, node.stackTrail) !== null) {
        collectParentClaims({ type: 'synthesized', union: node }, node, membership)
      }
    }

    const schemas = document.value.components?.schemas ?? {}

    for (const [key, schema] of Object.entries(schemas)) {
      if (schema.isRef()) {
        visitRef(schema)
        continue
      }

      if (isSealedUnion(context, schema)) {
        // The key IS a real component refName — parsed, not fabricated.
        collectParentClaims(
          { type: 'component', ref: fromModelKey(key) },
          schema,
          membership,
        )
      }

      walkSchema(schema, seen, visitInline)
    }

    // Operations AND webhooks — core keeps them in SEPARATE arrays, and
    // both carry the same parameters/requestBody/responses surface. The
    // scan must cover everything generation can walk: a position the
    // walk reaches but the scan never claimed yields a sealed interface
    // whose members never declare the supertype — uncompilable Kotlin,
    // emitted silently.
    for (const subject of [...document.value.operations, ...document.value.webhooks]) {
      walkRequestSurface(subject, seen, visitInline)
    }
  }

  membershipCache.set(document.value, membership)

  return membership
}

/**
 * Recursive structural walk over one subtree's NESTED nodes.
 * Presence-tested traversal (the router owns type dispatch): union
 * members, object properties + additionalProperties, array items. Refs
 * stop the walk (see `toSealedMembership`); the `seen` set guards
 * against parse-level node sharing.
 */
const walkSchema = (
  root: OasSchema,
  seen: Set<OasSchema>,
  visit: (node: OasSchema | OasRef<'schema'>) => void,
): void => {
  if ('members' in root) {
    for (const member of root.members) {
      walkSchemaOrRef(member, seen, visit)
    }
  }

  if ('properties' in root && root.properties) {
    for (const property of Object.values(root.properties)) {
      if (isWalkable(property)) {
        walkSchemaOrRef(property, seen, visit)
      }
    }
  }

  if (
    'additionalProperties' in root &&
    root.additionalProperties !== undefined &&
    typeof root.additionalProperties !== 'boolean'
  ) {
    walkSchemaOrRef(root.additionalProperties, seen, visit)
  }

  if ('items' in root && root.items !== undefined) {
    walkSchemaOrRef(root.items, seen, visit)
  }
}

type RequestSurface = {
  parameters?: (OasParameter | OasRef<'parameter'>)[] | undefined
  requestBody?: OasRequestBody | OasRef<'requestBody'> | undefined
  responses: Record<string, OasResponse | OasRef<'response'>>
}

/**
 * Every schema position one operation-shaped subject can carry — shared
 * by operations and webhooks. Parameters and headers hold a schema
 * directly OR under the `content` media-type alternative; request
 * bodies and responses hold theirs under `content`.
 */
const walkRequestSurface = (
  { parameters, requestBody, responses }: RequestSurface,
  seen: Set<OasSchema>,
  visit: (node: OasSchema | OasRef<'schema'>) => void,
): void => {
  const walkMediaTypes = (content: Record<string, OasMediaType> | undefined): void => {
    for (const mediaType of Object.values(content ?? {})) {
      if (mediaType.schema !== undefined) {
        walkSchemaOrRef(mediaType.schema, seen, visit)
      }
    }
  }

  for (const parameter of parameters ?? []) {
    const resolved = parameter.resolve()

    if (resolved.schema !== undefined) {
      walkSchemaOrRef(resolved.schema, seen, visit)
    }

    walkMediaTypes(resolved.content)
  }

  walkMediaTypes(requestBody?.resolve().content)

  for (const response of Object.values(responses)) {
    const resolved = response.resolve()

    walkMediaTypes(resolved.content)

    for (const header of Object.values(resolved.headers ?? {})) {
      const resolvedHeader = header.resolve()

      if (resolvedHeader.schema !== undefined) {
        walkSchemaOrRef(resolvedHeader.schema, seen, visit)
      }

      walkMediaTypes(resolvedHeader.content)
    }
  }
}

/** A property value may be a CustomValue — only OAS nodes are walkable. */
const isWalkable = (
  value: OasSchema | OasRef<'schema'> | CustomValue,
): value is OasSchema | OasRef<'schema'> => {
  return typeof value === 'object' && value !== null && 'isRef' in value
}

const walkSchemaOrRef = (
  node: OasSchema | OasRef<'schema'>,
  seen: Set<OasSchema>,
  visit: (node: OasSchema | OasRef<'schema'>) => void,
): void => {
  if (node.isRef()) {
    visit(node)
    return
  }

  if (seen.has(node)) {
    return
  }

  seen.add(node)
  visit(node)
  walkSchema(node, seen, visit)
}

const toParentKey = (parent: SealedParentIdentity): string => {
  return parent.type === 'component'
    ? `component:${toModelKey(parent.ref)}`
    : `synthesized:${parent.union.stackTrail.stackTrail.join('/')}`
}

const collectParentClaims = (
  parent: SealedParentIdentity,
  union: OasUnion,
  membership: Map<string, SealedParent[]>,
): void => {
  // isSealedUnion guarantees a discriminator and all-ref members; the
  // destructure narrows rather than asserts.
  const { propertyName } = union.discriminator ?? {}

  if (propertyName === undefined) {
    return
  }

  for (const member of union.members) {
    if (!member.isRef()) {
      continue
    }

    const memberKey = toModelKey(member)
    const claims = membership.get(memberKey) ?? []

    if (claims.some((claim) => toParentKey(claim.parent) === toParentKey(parent))) {
      continue
    }

    claims.push({ parent, discriminatorPropertyName: propertyName })
    membership.set(memberKey, claims)
  }
}

/**
 * The wire tag for one member under one parent: the `discriminator.mapping`
 * key whose value points at the member (`#/components/schemas/Dog`, or a
 * value that ends in `Dog`), else the member's refName (the OpenAPI
 * default when `mapping` is absent or does not name the member).
 */
export const toMemberTag = (
  member: RefParts,
  mapping: Record<string, string>,
): string => {
  for (const [tag, target] of Object.entries(mapping)) {
    const targetRef = toRefParts({ $ref: target })
    // A whole pointer is matched as one. Any other value (`Dog`, `./Dog`,
    // `other.yaml#/components/schemas/Dog`) is matched by its last segment.
    const matches = target.startsWith('#')
      ? toModelKey(targetRef) === toModelKey(member)
      : targetRef.refName === member.refName

    if (matches) {
      return tag
    }
  }

  return member.refName
}
