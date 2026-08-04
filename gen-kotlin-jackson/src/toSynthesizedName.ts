import { camelCase, capitalize, toMethodVerb } from '@skmtc/core'
import type { Method, StackTrail } from '@skmtc/core'

const METHODS: readonly Method[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace'
]

const isMethodFrame = (frame: string): frame is Method => {
  const methodFrames: readonly string[] = METHODS

  return methodFrames.includes(frame)
}

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
 * positions have distinct trails, so names are deterministic and
 * collision-free by construction.
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
  const frames = stackTrail.stackTrail

  const componentsIndex = frames.indexOf('components')

  if (componentsIndex !== -1 && frames[componentsIndex + 1] === 'schemas') {
    return toSegments(frames.slice(componentsIndex + 2)).join('')
  }

  const pathsIndex = frames.indexOf('paths')

  if (pathsIndex !== -1) {
    return toOperationRootedName(frames.slice(pathsIndex + 1))
  }

  // A schema with no recognizable position (synthesized programmatically,
  // or a document shape this derivation has not been designed for) has no
  // honest name — throw rather than invent one. The engine isolates the
  // throw to this subject's artifact.
  throw new Error(
    `Cannot synthesize a declaration name: unrecognized stack trail [${frames.join(', ')}]`
  )
}

const toOperationRootedName = (frames: string[]): string => {
  const [path, method, ...rest] = frames

  if (path === undefined || method === undefined || !isMethodFrame(method)) {
    throw new Error(
      `Cannot synthesize a declaration name: operation trail lacks path/method [${frames.join(', ')}]`
    )
  }

  const base = capitalize(camelCase(`${toMethodVerb(method)}Api${path}`))

  return `${base}${toSegments(rest).join('')}`
}

/**
 * Positional frames → name segments. Structural frames vanish
 * (`properties`, `content` and its media-type frame, `schema`), container
 * frames become fixed segments (`items` → `Item`, `additionalProperties`
 * → `Value`, `requestBody` → `Body`, `responses` → `Response` with 2xx
 * status codes elided), and everything else contributes its
 * PascalCased self.
 */
const toSegments = (frames: string[]): string[] => {
  const segments: string[] = []

  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index]

    if (frame === 'properties' || frame === 'schema') {
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
