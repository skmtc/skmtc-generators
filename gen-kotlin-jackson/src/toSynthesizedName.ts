import { camelCase, capitalize, isMethod, toMethodVerb } from '@skmtc/core'
import type { StackTrail } from '@skmtc/core'

/**
 * Derive the name for a synthesized declaration from the schema's own
 * position — its `stackTrail`. Kotlin has no anonymous class literal, so
 * an inline object with properties must be declared as a named sibling;
 * this function is where that name comes from.
 *
 * Reading position off the trail (instead of threading a naming hint
 * through the router) means EVERY construction path derives the same
 * name — including peers that reach the value through core's
 * `SchemaToValueFn` contract, which carries no naming hint. Distinct
 * positions have distinct TRAILS, but the NAMES derived from them are
 * not collision-free: distinct keys converge under `camelCase`, and the
 * derived name shares one Kotlin package with every component-derived
 * class name. Collisions are therefore policed at the declaration site
 * by `claimSynthesizedName` (synthesizedNames.ts) — this function only
 * answers "what is this position called".
 *
 * Anchoring: the head of a trail carries tracing frames
 * (`trace-<ts>`, `span-<ts>`, `parse`) whose timestamps vary per run —
 * derivation anchors on the document landmarks (`components`/`paths`),
 * never on absolute indices, and the tracing frames never reach a name.
 *
 * Two roots (verified in the kotlin-debug rig, 2026-08-04):
 * - model:     [..., components, schemas, Order, properties, metadata]
 *              → `OrderMetadata`
 * - operation: [..., paths, /orders, post, requestBody, content,
 *              application/json, schema] → `CreateApiOrdersBody`
 *              (reusing core's method-verb vocabulary: post → Create)
 */
export const toSynthesizedName = (stackTrail: StackTrail): string => {
  const name = toSynthesizedNameOrNull(stackTrail)

  if (name === null) {
    // A schema with no recognizable position (synthesized
    // programmatically, or a document shape this derivation has not been
    // designed for — `components/requestBodies/…`, `webhooks/…`) has no
    // honest name — throw rather than invent one. The engine isolates
    // the throw to this subject's artifact.
    throw new Error(
      `Cannot synthesize a declaration name: unrecognized stack trail [${stackTrail.stackTrail.join(', ')}]`
    )
  }

  return name
}

/**
 * The non-throwing derivability probe. Sealed-union machinery keys on
 * this SHARED answer at every site — the membership scan (claim or
 * skip), the union's render site (sealed name or `JsonNode`), and
 * through them the members' supertype clauses — so an underivable
 * position degrades to the pre-synthesis behavior consistently instead
 * of one site declaring what another cannot name. Teaching THIS
 * function a new root (`components/<section>`, `webhooks`) upgrades all
 * of them in lockstep.
 */
export const toSynthesizedNameOrNull = (stackTrail: StackTrail): string | null => {
  const frames = stackTrail.stackTrail

  const componentsIndex = frames.indexOf('components')

  if (componentsIndex !== -1 && frames[componentsIndex + 1] === 'schemas') {
    // The first frame after `components/schemas` is a user-chosen
    // COMPONENT NAME — consumed positionally (the same rule that makes
    // `properties` consume its key), so a component named `items` or
    // `schema` contributes its PascalCased self instead of being read
    // as a structural marker.
    const [componentName, ...rest] = frames.slice(componentsIndex + 2)

    if (componentName === undefined) {
      return null
    }

    const segments = toSegments(rest)

    if (segments === null) {
      return null
    }

    return `${capitalize(camelCase(componentName))}${segments.join('')}`
  }

  const pathsIndex = frames.indexOf('paths')

  if (pathsIndex !== -1) {
    return toOperationRootedName(frames.slice(pathsIndex + 1))
  }

  return null
}

const toOperationRootedName = (frames: string[]): string | null => {
  const [path, method, ...rest] = frames

  if (path === undefined || method === undefined || !isMethod(method)) {
    return null
  }

  const segments = toSegments(rest)

  if (segments === null) {
    return null
  }

  const base = capitalize(camelCase(`${toMethodVerb(method)}Api${path}`))

  return `${base}${segments.join('')}`
}

/**
 * Positional frames → name segments, or `null` when the position has no
 * stable name. Classification is POSITIONAL, not lexical, under one
 * general rule: **every frame that introduces a user-chosen key
 * consumes the next frame literally** — `properties` (property name),
 * `headers` (header name), `content` (media type; structural, dropped),
 * and `components/schemas` (component name, consumed by the caller).
 * A property or header literally called `items` or `schema` therefore
 * contributes its PascalCased self, never a structural reading. The
 * remaining structural frames can then be matched by value: a bare
 * `schema` vanishes (operation trails), combinator keywords vanish, and
 * container frames become fixed segments (`items` → `Item`,
 * `additionalProperties` → `Value`, `requestBody` → `Body`, `responses`
 * → `Response` with 2xx status codes elided). Everything else
 * contributes its PascalCased self.
 *
 * `parameters/<index>` is UNDERIVABLE (`null`): the trail addresses the
 * parameter by array position, and an absolute index in a public class
 * name churns whenever a spec edit reorders parameters — exactly what
 * anchoring on landmarks exists to prevent.
 *
 * THE INTERIM DECISION (PR #30 review): through the shared probe a
 * parameter-position union degrades softly (`JsonNode`, no clause), but
 * an inline OBJECT or ENUM in a parameter — which has no honest
 * fallback — fails its subject loudly. Chosen over the index-derived
 * name deliberately: a loud per-subject failure names its cause; a
 * silently churning public identity does not. The durable fix is the
 * parameter NAME in the trail, but the naive core change collides with
 * the trail's OTHER contract — `StackTrail.toJsonPointer()` must
 * resolve into the source document, and `parameters` is an ARRAY there
 * (core's attribution gate pins `#/paths/.../parameters/0`). Lifting
 * this needs either a dual-identity trail frame in core or a
 * document-scan name lookup here — a design decision, tracked on the
 * PR.
 */
const toSegments = (frames: string[]): string[] | null => {
  const segments: string[] = []

  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index]

    if (frame === 'properties') {
      const key = frames[index + 1]

      if (key !== undefined) {
        segments.push(capitalize(camelCase(key)))
      }

      index++
      continue
    }

    if (frame === 'headers') {
      segments.push('Headers')

      const key = frames[index + 1]

      if (key !== undefined) {
        segments.push(capitalize(camelCase(key)))
      }

      index++
      continue
    }

    if (frame === 'parameters' && /^\d+$/.test(frames[index + 1] ?? '')) {
      return null
    }

    if (frame === 'schema') {
      continue
    }

    // The union node's own combinator keyword — structure, not position
    // (`Order.properties.refund.oneOf` names `OrderRefund`). A PROPERTY
    // named `oneOf` never reaches this check: `properties` consumes its
    // key positionally above.
    if (frame === 'oneOf' || frame === 'anyOf' || frame === 'allOf') {
      continue
    }

    if (frame === 'content') {
      // The frame after `content` is the media type (`application/json`) —
      // structural, never part of a name.
      index++
      continue
    }

    if (frame === 'items') {
      segments.push('Item')
      continue
    }

    if (frame === 'additionalProperties') {
      segments.push('Value')
      continue
    }

    if (frame === 'requestBody') {
      segments.push('Body')
      continue
    }

    if (frame === 'responses') {
      segments.push('Response')

      const statusFrame = frames[index + 1]

      // A 2xx status adds nothing (`GetApiOrdersResponse`); any other
      // status stays in the name so two inline response schemas cannot
      // collide (`GetApiOrdersResponse404`).
      if (statusFrame !== undefined && /^2\d\d$/.test(statusFrame)) {
        index++
      }
      continue
    }

    segments.push(capitalize(camelCase(frame)))
  }

  return segments
}
