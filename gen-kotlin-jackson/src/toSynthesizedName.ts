import { camelCase, capitalize, isMethod, toMethodVerb } from '@skmtc/core'
import type { GenerateContextType, StackTrail } from '@skmtc/core'

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
 *
 * The operation root has one position the frames alone cannot name — a
 * parameter, addressed there by array INDEX — resolved back to the
 * parameter's name by `toParameterName` below:
 * - parameter: [..., paths, /x, get, parameters, 0, schema]
 *              → `GetApiXFilter`
 */
export const toSynthesizedName = (
  context: GenerateContextType,
  stackTrail: StackTrail,
): string => {
  const name = toSynthesizedNameOrNull(context, stackTrail)

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
export const toSynthesizedNameOrNull = (
  context: GenerateContextType,
  stackTrail: StackTrail,
): string | null => {
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
    return toOperationRootedName(context, frames.slice(pathsIndex + 1))
  }

  return null
}

const toOperationRootedName = (
  context: GenerateContextType,
  frames: string[],
): string | null => {
  const [path, method, ...rest] = frames

  if (path === undefined || method === undefined || !isMethod(method)) {
    return null
  }

  const base = capitalize(camelCase(`${toMethodVerb(method)}Api${path}`))

  // A parameter position: the trail addresses the parameter by ARRAY
  // INDEX (the trail's other job is being a JSON Pointer into the
  // source document, where `parameters` IS an array), but an absolute
  // index in a public class name would churn on any reorder. The
  // document-scan lookup resolves the index back to the parameter's
  // NAME — the trail stays the only positional input, and the operation
  // is addressable from its own frames (path + method are landmarks).
  if (rest[0] === 'parameters' && /^\d+$/.test(rest[1] ?? '')) {
    const parameterName = toParameterName(context, {
      path,
      method,
      index: rest[1] ?? '',
    })

    if (parameterName === null) {
      return null
    }

    const segments = toSegments(rest.slice(2))

    if (segments === null) {
      return null
    }

    return `${base}${capitalize(camelCase(parameterName))}${segments.join('')}`
  }

  const segments = toSegments(rest)

  if (segments === null) {
    return null
  }

  return `${base}${segments.join('')}`
}

type ToParameterNameArgs = {
  path: string
  method: string
  index: string
}

/**
 * Resolve a `parameters/<index>` trail position to the parameter's NAME
 * — a pure function of the document, WeakMap-memoized (the
 * `toSealedMembership` scan shape). Core parses each operation's
 * `parameters` straight off the operation object, so
 * `operation.parameters[index]` matches the trail index exactly; a
 * `$ref` entry resolves to its named definition. Unknown positions
 * (malformed index, webhook-rooted trails — a root this derivation does
 * not yet know) return `null` and stay underivable.
 *
 * Reachable for an INLINE parameter only, and that is not a limitation
 * of this lookup: a `$ref`ed parameter's SCHEMA was parsed under
 * `components/parameters/<name>/…`, so its trail never reaches the
 * operation-rooted branch that consults this map. Such a schema stays
 * underivable with every other `components/<section>` position
 * (`requestBodies`, `responses`, `headers`) — one family, one root to
 * teach, not a parameter-specific gap.
 */
const parameterNamesCache = new WeakMap<object, Map<string, string>>()

const toParameterName = (
  context: GenerateContextType,
  { path, method, index }: ToParameterNameArgs,
): string | null => {
  const { document } = context

  const cached = parameterNamesCache.get(document.value)

  if (cached) {
    return cached.get(`${path}\u0000${method}\u0000${index}`) ?? null
  }

  const names = new Map<string, string>()

  if (document.type === 'oas') {
    for (const operation of document.value.operations) {
      for (const [position, parameter] of (operation.parameters ?? []).entries()) {
        names.set(
          `${operation.path}\u0000${operation.method}\u0000${position}`,
          parameter.resolve().name,
        )
      }
    }
  }

  parameterNamesCache.set(document.value, names)

  return names.get(`${path}\u0000${method}\u0000${index}`) ?? null
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
 * A `parameters/<index>` frame pair reaching THIS function (rather than
 * the operation-rooted branch, which resolves the index to the
 * parameter's NAME via the document scan) is a position the resolution
 * did not recognize — UNDERIVABLE (`null`), never an absolute index in
 * a public class name.
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

    // Backstop, unreachable today: the operation-rooted branch resolves
    // every `parameters/<index>` pair before delegating here, and in a
    // component-rooted trail `properties` consumes a user key named
    // `parameters` positionally. Kept so that a future root reaching
    // this loop with an index-addressed pair degrades rather than
    // putting an array position into a public class name.
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
