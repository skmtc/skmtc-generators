import type { GenerateContextType, OasObject, OasOperation, Stringable } from '@skmtc/core'
import { camelCase, capitalize } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { sdkConfig as config } from '@/config.ts'
import type { SharedHashes } from '@skmtc/gen-kotlin-jackson-s'
import { AbsentBody } from '@/params/body/AbsentBody.ts'
import { MapBody } from '@/params/body/MapBody.ts'
import { ModelBody } from '@/params/body/ModelBody.ts'
import { RefBody } from '@/params/body/RefBody.ts'

/**
 * What a request-body shape contributes to each section of a Params
 * class. The shape is chosen ONCE (the `toBodySnippet` router below);
 * every section Snippet reads these members and never asks which
 * shape it is. `lead` members sit in the params position; `tail`
 * members after the headers/query members (the map shape's
 * `additionalBodyProperties` axis sits last — corpus:
 * AuthRuleV2DeleteParams).
 */
export type BodySnippet = {
  constructorLeadLines: string[]
  constructorTailLines: string[]
  accessorSections: Stringable[]
  builderLeadVariables: string[]
  builderTailVariables: string[]
  fromLeadAssignments(fromParameter: string): string[]
  fromTailAssignments(fromParameter: string): string[]
  /** Setter blocks BEFORE the fixed additional-headers/query block. */
  setterSections: Stringable[]
  /** Setter blocks AFTER it (the map shape's self-managed ops). */
  tailSetterSections: Stringable[]
  buildLeadArguments: string[]
  buildTailArguments: string[]
  /** The `fun _body()` section ([] when the operation has no body). */
  bodyMethodSections: string[]
  /** Nested class sections (the model shape's Body class). */
  nestedSections: Stringable[]
  equalsLeadNames: string[]
  equalsTailNames: string[]
  /** Construction axis: blocks `none()`. */
  hasRequired: boolean
  /** Fence axis: entries in the required-fields KDoc fences. */
  fenceFields: string[]
}

/**
 * The classification the body router dispatches on — one of the three
 * corpus body shapes (KS-F F3 recon, all spec-triggered): an inline
 * object schema nests a full `Body` model class; a declared component
 * `$ref` types a single field by the component's class; a body-capable
 * verb with NO spec requestBody still gets the additionalBodyProperties
 * axis (`_body(): Map<String, JsonValue>?`, optional wiring).
 */
export type BodyShape =
  | { kind: 'model'; className: string; schema: OasObject }
  | { kind: 'ref'; className: string; kotlinName: string; description?: string }
  | { kind: 'map' }

const bodyCapableVerbs = new Set(['post', 'put', 'patch', 'delete'])

/** Classifies an operation's request body into the shape the router dispatches on. */
export const toBodyShape = (operation: OasOperation): BodyShape | undefined => {
  const schema = operation.toRequestBody(({ schema }) => schema)

  if (!schema) {
    // Stainless gives body-capable verbs the additionalBodyProperties
    // axis even when the spec declares no requestBody (corpus:
    // AuthRuleV2DeleteParams).
    return bodyCapableVerbs.has(operation.method) ? { kind: 'map' } : undefined
  }

  // A `$ref` body referencing a DECLARED model component renders the
  // named-field shape (corpus: ChallengeResponse). Any other ref body
  // nests a full model class named after the component (corpus:
  // VoidHoldRequest) — which name is a model is Stainless config, so
  // it mirrors as config here.
  const refName = schema.isRef() ? schema.toRefName() : undefined

  if (refName && (config.modelComponents ?? []).includes(refName)) {
    return {
      kind: 'ref',
      className: capitalize(camelCase(refName)),
      kotlinName: camelCase(refName),
      description: schema.resolve().description
    }
  }

  const resolved = schema.isRef() ? schema.resolve() : schema

  invariant(
    resolved.type === 'object',
    `@skmtc/gen-kotlin-sdk: ${operation.method} ${operation.path} request body is not an object schema`
  )

  return {
    kind: 'model',
    className: refName ? capitalize(camelCase(refName)) : 'Body',
    schema: resolved
  }
}

/**
 * Construction axis: a body that blocks `none()` — a ref body is a
 * required member, and a model body with spec-required fields keeps
 * them required (the `fieldStates` demotion never applies to
 * spec-required fields).
 */
export const bodyHasRequired = (shape: BodyShape | undefined): boolean => {
  return (
    shape?.kind === 'ref' ||
    (shape?.kind === 'model' && (shape.schema.required?.length ?? 0) > 0)
  )
}

type ToBodySnippetArgs = {
  context: GenerateContextType
  shape: BodyShape | undefined
  destinationPath: string
  sharedHashes: SharedHashes
}

/** The ONE place the body shape is decided (generator-code-quality.md, Rule 3). */
export const toBodySnippet = ({ context, shape, destinationPath, sharedHashes }: ToBodySnippetArgs): BodySnippet => {
  switch (shape?.kind) {
    case 'model':
      return new ModelBody({
        context,
        className: shape.className,
        schema: shape.schema,
        destinationPath,
        sharedHashes
      })
    case 'ref':
      return new RefBody({ context, body: shape, destinationPath })
    case 'map':
      return new MapBody({ context, destinationPath })
    case undefined:
      return new AbsentBody({ context })
    default: {
      const _exhaustive: never = shape
      throw new Error(`@skmtc/gen-kotlin-sdk: unhandled BodyShape: ${JSON.stringify(_exhaustive)}`)
    }
  }
}
