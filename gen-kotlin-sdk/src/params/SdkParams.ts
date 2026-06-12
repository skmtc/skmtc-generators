import type { OasOperation, OasSchema } from '@skmtc/core'
import { camelCase, capitalize } from '@skmtc/core'
import invariant from 'tiny-invariant'
import type { SdkEnum, SdkScalar } from '../model/SdkModel.ts'
import type { FieldEnums } from '../model/toSdkModel.ts'

/**
 * The KS-D domain record (note 32 §D-1): one per Params class; every
 * section is a pure renderer over it.
 */
export type SdkParams = {
  className: string
  /** Class KDoc: operation summary, falling back to the path slug. */
  description: string
  params: SdkParam[]
}

export type SdkParam = {
  kotlinName: string
  wireName: string
  location: 'path' | 'query'
  type: SdkParamType
  /** Path params are never construction-required (§D-1). */
  required: boolean
  description?: string
}

export type SdkParamType =
  | { kind: 'scalar'; kotlin: SdkScalar }
  | { kind: 'enum'; enumModel: SdkEnum }
  | { kind: 'datetime'; date: 'offset-date-time' | 'local-date' }

export const toParamTypeExpression = (type: SdkParamType): string => {
  switch (type.kind) {
    case 'scalar':
      return type.kotlin
    case 'enum':
      return type.enumModel.className
    case 'datetime':
      return type.date === 'local-date' ? 'LocalDate' : 'OffsetDateTime'
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
}

/** Walks `operation.parameters` into the domain record (§D-1/§D-2 ordering). */
export const toSdkParams = ({ operation, className, fieldEnums }: ToSdkParamsArgs): SdkParams => {
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
      location === 'path' || location === 'query',
      `@skmtc/gen-kotlin-sdk: unsupported parameter location '${location}' on '${name}'`
    )

    const schema = resolved.schema?.resolve()

    invariant(schema, `@skmtc/gen-kotlin-sdk: parameter '${name}' has no schema`)

    // Descriptions fall back from the parameter to its schema (the
    // corpus `time` param documents on the schema).
    const fullDescription = description ?? schema.description

    const type = toParamType({ name, schema, fieldEnums })

    if (type.kind === 'enum' && !type.enumModel.description) {
      type.enumModel.description = fullDescription
    }

    return {
      kotlinName: toParamKotlinName(name),
      wireName: name,
      location,
      type,
      required: location === 'path' ? false : required === true,
      // Path params render no description KDoc (corpus: agencyID).
      description: location === 'path' ? undefined : fullDescription
    } satisfies SdkParam
  })

  const byNameIdFirst = (a: SdkParam, b: SdkParam) => {
    if (a.kotlinName === 'id') return -1
    if (b.kotlinName === 'id') return 1
    return a.kotlinName.localeCompare(b.kotlinName)
  }

  const path = params.filter(param => param.location === 'path')
  const requiredQuery = params.filter(param => param.location === 'query' && param.required)
  const optionalQuery = params.filter(param => param.location === 'query' && !param.required)

  return {
    className,
    description:
      operation.description ?? operation.summary ?? toPathSlug(operation.path),
    params: [...path, ...requiredQuery.sort(byNameIdFirst), ...optionalQuery.sort(byNameIdFirst)]
  }
}

/** Wire `agencyID` → `agencyId` — trailing acronym normalization. */
const toParamKotlinName = (name: string): string => {
  return camelCase(name).replace(/ID$/, 'Id')
}

type ToParamTypeArgs = {
  name: string
  schema: OasSchema
  fieldEnums?: FieldEnums
}

const toParamType = ({ name, schema, fieldEnums }: ToParamTypeArgs): SdkParamType => {
  switch (schema.type) {
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
            className: capitalize(camelCase(name)),
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
