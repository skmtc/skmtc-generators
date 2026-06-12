import type { OasOperation, OasSchema } from '@skmtc/core'
import { camelCase, capitalize } from '@skmtc/core'
import invariant from 'tiny-invariant'
import type { SdkEnum, SdkModel, SdkScalar } from '@/model/SdkModel.ts'
import { toSdkModel } from '@/model/toSdkModel.ts'
import type { FieldEnums, FieldStates, SharedHashes } from '@/model/toSdkModel.ts'

/**
 * The KS-D domain record (note 32 §D-1): one per Params class; every
 * section is a pure renderer over it. KS-F F3 adds the request-body
 * axis (`body`).
 */
export type SdkParams = {
  className: string
  /** Class KDoc: operation summary, falling back to the path slug. */
  description: string
  params: SdkParam[]
  /** Absent on GET/HEAD operations (the whole KS-D surface). */
  body?: SdkBody
  /** `@Deprecated(...)` message — config message, or `deprecated` for spec-deprecated ops. */
  deprecated?: string
}

/**
 * The three corpus body shapes (KS-F F3 recon, all spec-triggered):
 * an inline object schema nests a full `Body` model class; a component
 * `$ref` types a single field by the component's class; a body-capable
 * verb with NO spec requestBody still gets the additionalBodyProperties
 * axis (`_body(): Map<String, JsonValue>?`, optional wiring).
 */
export type SdkBody =
  | { kind: 'model'; model: SdkModel }
  | { kind: 'ref'; className: string; kotlinName: string; description?: string }
  | { kind: 'map' }

/** The nested body class name — `Body` for inline schemas, the component name for single-use refs. */
export const bodyClassName = (body: Extract<SdkBody, { kind: 'model' }>): string =>
  body.model.className

/** Construction axis: a body that blocks `none()` (ref, or required model fields). */
export const bodyHasRequired = (body: SdkBody | undefined): boolean => {
  return (
    body?.kind === 'ref' ||
    (body?.kind === 'model' && body.model.fields.some(field => field.required))
  )
}

/** Fence axis: the body's entries in the required-fields KDoc fences. */
export const bodyFenceFields = (body: SdkBody | undefined): string[] => {
  if (body?.kind === 'ref') {
    return [body.kotlinName]
  }

  if (body?.kind === 'model') {
    return body.model.fields.filter(field => field.fenceRequired).map(field => field.kotlinName)
  }

  return []
}

export type SdkParam = {
  kotlinName: string
  wireName: string
  location: 'path' | 'query' | 'header'
  type: SdkParamType
  /** Path params are never construction-required (§D-1). */
  required: boolean
  description?: string
}

export type SdkParamType =
  | { kind: 'scalar'; kotlin: SdkScalar }
  | { kind: 'enum'; enumModel: SdkEnum }
  | { kind: 'datetime'; date: 'offset-date-time' | 'local-date' }
  | { kind: 'list'; element: SdkParamType }

export const toParamTypeExpression = (type: SdkParamType): string => {
  switch (type.kind) {
    case 'scalar':
      return type.kotlin
    case 'enum':
      return type.enumModel.className
    case 'datetime':
      return type.date === 'local-date' ? 'LocalDate' : 'OffsetDateTime'
    case 'list':
      return `List<${toParamTypeExpression(type.element)}>`
    default: {
      const _exhaustive: never = type
      throw new Error(`Unhandled SdkParamType: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

type ToSdkParamsArgs = {
  operation: OasOperation
  className: string
  fieldEnums?: FieldEnums
  fieldStates?: FieldStates
  /** Shared-model identity for body-field classification; harmless to omit when only `hasNone`/body-kind are read. */
  sharedHashes?: SharedHashes
  /** The per-target hoist name (config-mirrored; defaults to `id`). */
  hoistField?: string
  /** Component refNames with standalone model classes (config-mirrored). */
  modelComponents?: string[]
  /** Per-wire-name Kotlin name overrides (acronym casing). */
  kotlinNames?: Record<string, string>
  /** Config deprecation message (the enrichment's `deprecatedMessage`). */
  deprecatedMessage?: string
}

/** Walks `operation.parameters` into the domain record (§D-1/§D-2 ordering). */
export const toSdkParams = ({
  operation,
  className,
  fieldEnums,
  fieldStates,
  sharedHashes,
  hoistField,
  modelComponents,
  kotlinNames,
  deprecatedMessage
}: ToSdkParamsArgs): SdkParams => {
  // Path-item-level parameters apply to every operation on the path;
  // core keeps them on `operation.pathItem` (no merge). Operation-level
  // declarations override by (name, location).
  const operationLevel = operation.parameters ?? []
  const operationKeys = new Set(
    operationLevel.map(parameter => {
      const resolved = parameter.isRef() ? parameter.resolve() : parameter

      return `${resolved.location}:${resolved.name}`
    })
  )
  const pathLevel = (operation.pathItem?.parameters ?? []).filter(parameter => {
    const resolved = parameter.isRef() ? parameter.resolve() : parameter

    return !operationKeys.has(`${resolved.location}:${resolved.name}`)
  })

  const params = [...pathLevel, ...operationLevel].map(parameter => {
    const resolved = parameter.isRef() ? parameter.resolve() : parameter
    const { name, location, required, description } = resolved

    invariant(
      location === 'path' || location === 'query' || location === 'header',
      `@skmtc/gen-kotlin-sdk: unsupported parameter location '${location}' on '${name}'`
    )

    const rawSchema = resolved.schema
    const schema = rawSchema?.resolve()

    invariant(schema, `@skmtc/gen-kotlin-sdk: parameter '${name}' has no schema`)

    // Descriptions fall back from the parameter to its schema (the
    // corpus `time` param documents on the schema).
    const fullDescription = description ?? schema.description

    // A component-ref enum names its class after the COMPONENT
    // (corpus: `status` param → `HoldStatus`), and the parameter
    // description outranks the component's for the enum KDoc.
    const refName = rawSchema?.isRef() ? rawSchema.toRefName() : undefined

    const type = toParamType({ name, schema, fieldEnums, refName })

    if (type.kind === 'enum') {
      type.enumModel.description = description ?? type.enumModel.description ?? fullDescription
    }

    return {
      kotlinName: kotlinNames?.[name] ?? toParamKotlinName(name),
      wireName: name,
      location,
      type,
      required: location === 'path' ? false : required === true,
      // Query params document from the parameter, falling back to the
      // schema; path and header params document from the SCHEMA only
      // (corpus: hold_token's parameter-level text drops while
      // credit_product_token's schema-level text renders).
      description: location === 'query' ? fullDescription : schema.description
    } satisfies SdkParam
  })

  const hoistName = hoistField ?? 'id'
  const byNameHoistFirst = (a: SdkParam, b: SdkParam) => {
    if (a.kotlinName === hoistName) return -1
    if (b.kotlinName === hoistName) return 1
    return a.kotlinName.localeCompare(b.kotlinName)
  }

  // Path params order by their position in the PATH TEMPLATE, not
  // declaration order (corpus: DisputeDeleteEvidenceParams declares
  // evidence_token first but the path leads with dispute_token).
  const templateOrder = [...operation.path.matchAll(/\{([^}]+)\}/g)].map(match => match[1])
  const byTemplate = (a: SdkParam, b: SdkParam) =>
    templateOrder.indexOf(a.wireName) - templateOrder.indexOf(b.wireName)

  // Multi-path-param rule (corpus: AccountHolderRetrieveDocumentParams):
  // every path param EXCEPT THE LAST is construction-required — only
  // the last one is positionally settable via the service overload and
  // stays nullable (the single-param case keeps the §D-1 behavior).
  const pathParams = params.filter(param => param.location === 'path').sort(byTemplate)
  const path = pathParams.map((param, index) =>
    index < pathParams.length - 1 ? { ...param, required: true } : param
  )
  const header = params.filter(param => param.location === 'header')
  const requiredQuery = params.filter(param => param.location === 'query' && param.required)
  const optionalQuery = params.filter(param => param.location === 'query' && !param.required)

  return {
    className,
    description:
      operation.description ?? operation.summary ?? toPathSlug(operation.path),
    // Header params sit between path params and the query groups
    // (corpus: idempotencyKey leads CardCreateParams' constructor).
    params: [
      ...path,
      ...header.sort(byNameHoistFirst),
      ...requiredQuery.sort(byNameHoistFirst),
      ...optionalQuery.sort(byNameHoistFirst)
    ],
    deprecated:
      deprecatedMessage ?? (operation.deprecated === true ? 'deprecated' : undefined),
    body: toSdkBody({
      operation,
      fieldEnums,
      fieldStates,
      sharedHashes,
      hoistField,
      modelComponents,
      kotlinNames
    })
  }
}

const bodyCapableVerbs = new Set(['post', 'put', 'patch', 'delete'])

type ToSdkBodyArgs = {
  operation: OasOperation
  fieldEnums?: FieldEnums
  fieldStates?: FieldStates
  sharedHashes?: SharedHashes
  hoistField?: string
  modelComponents?: string[]
  kotlinNames?: Record<string, string>
}

const toSdkBody = ({
  operation,
  fieldEnums,
  fieldStates,
  sharedHashes,
  hoistField,
  modelComponents,
  kotlinNames
}: ToSdkBodyArgs): SdkBody | undefined => {
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

  if (refName && (modelComponents ?? []).includes(refName)) {
    const className = capitalize(camelCase(refName))

    return {
      kind: 'ref',
      className,
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
    model: toSdkModel({
      schema: resolved,
      className: refName ? capitalize(camelCase(refName)) : 'Body',
      sharedHashes: sharedHashes ?? new Map(),
      fieldStates,
      fieldEnums,
      // Body classes use the component-shaped sort (corpus:
      // CardCreateParams.Body — required-first, alphabetical).
      sortFields: true,
      hoistField,
      kotlinNames
    })
  }
}

/** Wire `agencyID` → `agencyId` — trailing acronym normalization. */
const toParamKotlinName = (name: string): string => {
  return camelCase(name).replace(/ID$/, 'Id')
}

/** `account_types` → `account_type` (list-element naming). */
const toSingularName = (name: string): string => {
  if (name.endsWith('ies')) {
    return `${name.slice(0, -3)}y`
  }

  return name.endsWith('s') && !name.endsWith('ss') ? name.slice(0, -1) : name
}

type ToParamTypeArgs = {
  name: string
  schema: OasSchema
  fieldEnums?: FieldEnums
  /** The component name when the parameter schema is a `$ref` — names ref-backed enums. */
  refName?: string
}

const toParamType = ({ name, schema, fieldEnums, refName }: ToParamTypeArgs): SdkParamType => {
  switch (schema.type) {
    case 'array': {
      const elementRefName = schema.items.isRef() ? schema.items.toRefName() : undefined
      const items = schema.items.isRef() ? schema.items.resolve() : schema.items
      // The element's enum/scalar naming derives from the singular
      // form (`account_types` → `AccountType`).
      const elementName = toSingularName(name)

      return {
        kind: 'list',
        element: toParamType({
          name: elementName,
          schema: items,
          fieldEnums,
          refName: elementRefName
        })
      }
    }
    case 'string': {
      if (schema.format === 'date-time') {
        return { kind: 'datetime', date: 'offset-date-time' }
      }

      if (schema.format === 'date') {
        return { kind: 'datetime', date: 'local-date' }
      }

      const specMembers = (schema.enums ?? []).filter(
        (member): member is string => typeof member === 'string'
      )
      const members = specMembers.length ? specMembers : (fieldEnums?.[name] ?? [])

      if (members.length) {
        return {
          kind: 'enum',
          enumModel: {
            className: capitalize(camelCase(refName ?? name)),
            description: schema.description,
            members
          }
        }
      }

      return { kind: 'scalar', kotlin: 'String' }
    }
    case 'integer':
      return { kind: 'scalar', kotlin: schema.format === 'int32' ? 'Int' : 'Long' }
    case 'number':
      return { kind: 'scalar', kotlin: schema.format === 'float' ? 'Float' : 'Double' }
    case 'boolean':
      return { kind: 'scalar', kotlin: 'Boolean' }
    default:
      throw new Error(
        `@skmtc/gen-kotlin-sdk: unmapped parameter schema type '${schema.type}' on '${name}'`
      )
  }
}

/** `/api/where/stops-for-location.json` → `stops-for-location`. */
const toPathSlug = (path: string): string => {
  const segments = path.split('/').filter(Boolean)
  const last = segments[segments.length - 1] ?? path

  return last.replace(/\.json$/, '').replace(/\{.*\}/, '').replace(/\/$/, '')
}
