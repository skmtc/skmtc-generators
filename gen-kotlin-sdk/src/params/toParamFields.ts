import type { GenerateContextType, OasOperation, OasParameter, OasSchema } from '@skmtc/core'
import { camelCase, capitalize } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { sdkConfig as config } from '@/config.ts'
import { toSingular } from '@/naming.ts'
import { ListParamField, ParamField, type WireForm } from '@/params/ParamField.ts'
import {
  KtDatetimeType,
  KtEnumType,
  KtListType,
  KtScalarType,
  type KtType
} from '@/model/types/KtTypes.ts'

type ToParamFieldsArgs = {
  context: GenerateContextType
  operation: OasOperation
  destinationPath: string
}

/**
 * Walks `operation.parameters` into param producers, in corpus order
 * (§D-1/§D-2): path params by path-template position, then header,
 * required-query, optional-query — the latter three required-first then
 * alphabetical with the hoist field first. Path-item-level parameters
 * apply unless an operation-level declaration overrides them by
 * (location, name).
 */
export const toParamFields = ({ context, operation, destinationPath }: ToParamFieldsArgs): ParamField[] => {
  const parameters = resolveParameters(operation)
  const lastPathName = toLastPathName(operation, parameters)

  const fields = parameters.map(parameter =>
    toParamField({
      context,
      parameter,
      required: isConstructionRequired(parameter, parameters, lastPathName),
      destinationPath
    })
  )

  const templateOrder = toTemplateOrder(operation)
  const hoistName = config.hoistField ?? 'id'
  const byNameHoistFirst = (a: ParamField, b: ParamField) => {
    if (a.kotlinName === hoistName) return -1
    if (b.kotlinName === hoistName) return 1
    return a.kotlinName.localeCompare(b.kotlinName)
  }
  const byTemplate = (a: ParamField, b: ParamField) =>
    templateOrder.indexOf(a.wireName) - templateOrder.indexOf(b.wireName)

  // Header params sit between path params and the query groups (corpus:
  // idempotencyKey leads CardCreateParams' constructor).
  return [
    ...fields.filter(field => field.location === 'path').sort(byTemplate),
    ...fields.filter(field => field.location === 'header').sort(byNameHoistFirst),
    ...fields.filter(field => field.location === 'query' && field.required).sort(byNameHoistFirst),
    ...fields.filter(field => field.location === 'query' && !field.required).sort(byNameHoistFirst)
  ]
}

/**
 * The Kotlin name of the template-last path parameter — the one that is
 * positionally settable via the service overload (so not
 * construction-required). Side-effect-free: it reads the same
 * resolution and naming rules the producers use, without constructing
 * them, so a caller that only needs the fact (the service) never
 * registers imports.
 */
export const lastPathParamName = (operation: OasOperation): string | undefined => {
  const lastName = toLastPathName(operation, resolveParameters(operation))

  return lastName ? (config.kotlinNames?.[lastName] ?? toParamKotlinName(lastName)) : undefined
}

/** Whether any parameter is construction-required — the same rule the producers carry. */
export const paramsHaveRequired = (operation: OasOperation): boolean => {
  const parameters = resolveParameters(operation)
  const lastPathName = toLastPathName(operation, parameters)

  return parameters.some(parameter => isConstructionRequired(parameter, parameters, lastPathName))
}

/**
 * Resolves an operation's parameters (parameter-level refs followed).
 * Path-item-level parameters apply unless an operation-level
 * declaration overrides them by (location, name).
 */
const resolveParameters = (operation: OasOperation): OasParameter[] => {
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

  return [...pathLevel, ...operationLevel].map(parameter =>
    parameter.isRef() ? parameter.resolve() : parameter
  )
}

/** The path-template variable names, in template order. */
const toTemplateOrder = (operation: OasOperation): string[] => {
  return [...operation.path.matchAll(/\{([^}]+)\}/g)].map(match => match[1])
}

/** The wire name of the template-last path parameter, if any. */
const toLastPathName = (operation: OasOperation, parameters: OasParameter[]): string | undefined => {
  const templateOrder = toTemplateOrder(operation)
  const pathNames = parameters
    .filter(parameter => parameter.location === 'path')
    .map(parameter => parameter.name)

  return pathNames.length
    ? [...pathNames].sort((a, b) => templateOrder.indexOf(a) - templateOrder.indexOf(b)).at(-1)
    : undefined
}

/**
 * Construction-requiredness. Path params are never construction-required
 * EXCEPT when more than one path param exists, in which case every path
 * param but the template-last is required (the multi-path-param rule;
 * corpus: AccountHolderRetrieveDocumentParams). Query/header params use
 * the spec `required` flag.
 */
const isConstructionRequired = (
  parameter: OasParameter,
  parameters: OasParameter[],
  lastPathName: string | undefined
): boolean => {
  if (parameter.location !== 'path') {
    return parameter.required === true
  }

  const pathCount = parameters.filter(candidate => candidate.location === 'path').length

  return pathCount > 1 && parameter.name !== lastPathName
}

type ToParamFieldArgs = {
  context: GenerateContextType
  /** A resolved parameter (parameter-level refs already followed). */
  parameter: OasParameter
  /** Construction-requiredness — decided by the walker (the multi-path-param rule needs cross-param context). */
  required: boolean
  destinationPath: string
}

/** The field router — the ONE place the list-vs-scalar param shape is chosen. */
const toParamField = ({ context, parameter, required, destinationPath }: ToParamFieldArgs): ParamField => {
  const { name, location, description: parameterDescription } = parameter

  invariant(
    location === 'path' || location === 'query' || location === 'header',
    `@skmtc/gen-kotlin-sdk: unsupported parameter location '${location}' on '${name}'`
  )

  const rawSchema = parameter.schema
  const schema = rawSchema?.resolve()

  invariant(schema, `@skmtc/gen-kotlin-sdk: parameter '${name}' has no schema`)

  // A component-ref schema names a ref-backed enum after the COMPONENT
  // (corpus: `status` param → `HoldStatus`).
  const refName = rawSchema?.isRef() ? rawSchema.toRefName() : undefined

  const type = toParamType({ context, name, schema, refName, parameterDescription, destinationPath })

  // Query params document from the parameter, falling back to the
  // schema; path and header params document from the SCHEMA only
  // (corpus: hold_token's parameter-level text drops while
  // credit_product_token's schema-level text renders).
  const fullDescription = parameterDescription ?? schema.description
  const description = location === 'query' ? fullDescription : schema.description

  const shared = {
    context,
    kotlinName: config.kotlinNames?.[name] ?? toParamKotlinName(name),
    wireName: name,
    location,
    required,
    description,
    wireForm: toWireForm(type),
    destinationPath
  }

  return type instanceof KtListType
    ? new ListParamField({ ...shared, type })
    : new ParamField({ ...shared, type })
}

type ToParamTypeArgs = {
  context: GenerateContextType
  name: string
  schema: OasSchema
  /** The component name when the parameter schema is a `$ref` — names ref-backed enums. */
  refName: string | undefined
  /** Top-level parameter description; absent for array elements. */
  parameterDescription: string | undefined
  destinationPath: string
}

/**
 * The param type router (the `toKtType` shape): one branch per schema
 * shape constructs one type producer, reusing the model type family —
 * datetimes register their own `java.time`, enums own their nested
 * `KnownValueEnum`. Never builds strings.
 */
const toParamType = (args: ToParamTypeArgs): KtType => {
  const { context, name, schema, refName, parameterDescription, destinationPath } = args

  switch (schema.type) {
    case 'array': {
      const elementRefName = schema.items.isRef() ? schema.items.toRefName() : undefined
      const items = schema.items.isRef() ? schema.items.resolve() : schema.items

      // The element's enum/scalar naming derives from the singular form
      // (`account_types` → `AccountType`); the parameter-description
      // override is top-level only (element enums use the schema text).
      return new KtListType({
        context,
        element: toParamType({
          context,
          name: toSingular(name),
          schema: items,
          refName: elementRefName,
          parameterDescription: undefined,
          destinationPath
        })
      })
    }
    case 'string': {
      if (schema.format === 'date-time') {
        return new KtDatetimeType({ context, date: 'offset-date-time', destinationPath })
      }

      if (schema.format === 'date') {
        return new KtDatetimeType({ context, date: 'local-date', destinationPath })
      }

      const specMembers = (schema.enums ?? []).filter(
        (member): member is string => typeof member === 'string'
      )
      const members = specMembers.length ? specMembers : (config.fieldEnums?.[name] ?? [])

      if (members.length) {
        return new KtEnumType({
          context,
          className: capitalize(camelCase(refName ?? name)),
          members,
          // The parameter description outranks the component's for the
          // enum KDoc, falling back to the schema description.
          description: parameterDescription ?? schema.description,
          destinationPath,
          documentedValidate: true
        })
      }

      return new KtScalarType({ context, kotlin: 'String' })
    }
    case 'integer':
      return new KtScalarType({ context, kotlin: schema.format === 'int32' ? 'Int' : 'Long' })
    case 'number':
      return new KtScalarType({ context, kotlin: schema.format === 'float' ? 'Float' : 'Double' })
    case 'boolean':
      return new KtScalarType({ context, kotlin: 'Boolean' })
    default:
      throw new Error(
        `@skmtc/gen-kotlin-sdk: unmapped parameter schema type '${schema.type}' on '${name}'`
      )
  }
}

/** Wire `agencyID` → `agencyId` — trailing acronym normalization. */
const toParamKotlinName = (name: string): string => {
  return camelCase(name).replace(/ID$/, 'Id')
}

/** Whether the wire value renders raw, `.toString()`, or via the ISO formatter. */
const toWireForm = (type: KtType): WireForm => {
  if (type instanceof KtScalarType) {
    return type.kotlin === 'String' ? 'string' : 'boxed-scalar'
  }

  if (type instanceof KtDatetimeType) {
    return type.date === 'offset-date-time' ? 'offset-datetime' : 'other'
  }

  return 'other'
}
