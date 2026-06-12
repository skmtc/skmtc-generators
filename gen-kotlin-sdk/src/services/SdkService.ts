import type { GenerateContextType, OasOperation } from '@skmtc/core'
import { camelCase, capitalize } from '@skmtc/core'
import invariant from 'tiny-invariant'
import type { SdkConfig } from '../SdkConfig.ts'
import type { SdkOperationEnrichment } from '../enrichments.ts'
import { toSdkParams } from '../params/SdkParams.ts'

/**
 * The KS-E domain record (note 32 §E-1): one per resource; the four
 * service files (blocking/async × interface/impl) all render over it.
 */
export type SdkService = {
  stem: string
  operations: SdkServiceOperation[]
}

export type SdkServiceOperation = {
  methodName: string
  paramsClassName: string
  responseClassName: string
  /** Envelope-only response — class imports from the models root. */
  responseIsEnvelope: boolean
  /** Resource directory for params/response imports. */
  resourceDir: string
  description: string
  httpVerb: string
  path: string
  pathSegments: SdkPathSegment[]
  /** First (only, on this corpus) path parameter, when present. */
  pathParam?: { kotlinName: string }
  /** The params class has `none()` (no required query params). */
  hasNone: boolean
}

export type SdkPathSegment =
  | { kind: 'literal'; value: string }
  | { kind: 'param'; index: number; suffix: string }

type ToSdkServiceArgs = {
  context: GenerateContextType
  config: SdkConfig
  stem: string
  resource: string[]
  resolveEnrichment: (operation: OasOperation) => SdkOperationEnrichment
}

/**
 * Self-contained build (§E-6): rescans the document for every
 * operation whose enrichment resource matches — a two-op resource
 * builds whole on the first insert; the second insert hits the cache.
 */
export const toSdkService = ({
  context,
  config,
  stem,
  resource,
  resolveEnrichment
}: ToSdkServiceArgs): SdkService => {
  invariant(context.document.type === 'oas', '@skmtc/gen-kotlin-sdk: OAS documents only')

  const resourceKey = resource.join('/')

  const operations = context.document.value.operations.flatMap(operation => {
    const enrichment = resolveEnrichment(operation)

    if (!enrichment || enrichment.resource.join('/') !== resourceKey) {
      return []
    }

    return [toServiceOperation({ operation, enrichment, config, stem })]
  })

  return { stem, operations }
}

type ToServiceOperationArgs = {
  operation: OasOperation
  enrichment: NonNullable<SdkOperationEnrichment>
  config: SdkConfig
  stem: string
}

const toServiceOperation = ({
  operation,
  enrichment,
  config,
  stem
}: ToServiceOperationArgs): SdkServiceOperation => {
  const methodName = camelCase(enrichment.method)
  const pascalMethod = capitalize(methodName)

  const params = toSdkParams({
    operation,
    className: `${stem}${pascalMethod}Params`,
    fieldEnums: config.fieldEnums
  })

  const pathParam = params.params.find(param => param.location === 'path')
  const hasRequired = params.params.some(param => param.required)

  const schema = operation.toSuccessResponse()?.resolve().toSchema()?.resolve()
  const envelope = config.sharedModels.envelope
  const responseIsEnvelope = envelope
    ? !schema ||
      schema.type !== 'object' ||
      Object.keys(schema.properties ?? {}).every(name =>
        new Set(envelope.fields).has(name)
      )
    : false

  return {
    methodName,
    paramsClassName: params.className,
    responseClassName:
      responseIsEnvelope && envelope
        ? envelope.className
        : `${stem}${pascalMethod}Response`,
    responseIsEnvelope,
    resourceDir: enrichment.resource.join('').toLowerCase(),
    description: operation.description ?? operation.summary ?? '',
    httpVerb: operation.method.toUpperCase(),
    path: operation.path,
    pathSegments: toPathSegments(operation.path),
    pathParam: pathParam ? { kotlinName: pathParam.kotlinName } : undefined,
    hasNone: !hasRequired
  }
}

/** `/api/where/agency/{agencyID}.json` → literals + indexed param slots. */
const toPathSegments = (path: string): SdkPathSegment[] => {
  let index = 0

  return path
    .split('/')
    .filter(Boolean)
    .map(segment => {
      const match = segment.match(/^\{[^}]+\}(.*)$/)

      if (match) {
        return { kind: 'param', index: index++, suffix: match[1] ?? '' } as const
      }

      return { kind: 'literal', value: segment } as const
    })
}
