import type { GenerateContextType, OasOperation } from '@skmtc/core'
import { camelCase, capitalize } from '@skmtc/core'
import invariant from 'tiny-invariant'
import type { ServiceFlavor } from '@/base.ts'
import type { SdkConfig } from '@/SdkConfig.ts'
import type { SdkOperationEnrichment } from '@/enrichments.ts'
import { bodyHasRequired, toBodyShape } from '@/params/body/BodySnippet.ts'
import { lastPathParamName, paramsHaveRequired } from '@/params/toParamFields.ts'

/**
 * The per-operation facts a service file renders over (note 32 §E-1): one
 * entry per operation in the resource. The two value snippets
 * (interface / impl) hold an array of these and render themselves from it —
 * there is no separate service "model" record.
 */
export type SdkServiceOperation = {
  methodName: string
  paramsClassName: string
  responseClassName: string
  /** Envelope-only response — class imports from the models root. */
  responseIsEnvelope: boolean
  /** Module suffix for params/response imports (`models` or `models.<resource>`, per layout). */
  modelsSubpackage: string
  description: string
  httpVerb: string
  path: string
  pathSegments: SdkPathSegment[]
  /** First (only, on this corpus) path parameter, when present. */
  pathParam?: { kotlinName: string }
  /** The params class has `none()` (no required params and no required body). */
  hasNone: boolean
  /**
   * Request-body wiring in the Impl (F3): `required` renders the
   * direct `.body(json(…, params._body()))` line (model/ref shapes);
   * `optional` the `.apply { params._body()?.let { … } }` form (the
   * map shape). Absent on GET.
   */
  bodyKind?: 'required' | 'optional'
}

export type SdkPathSegment =
  | { kind: 'literal'; value: string }
  | { kind: 'param'; index: number; suffix: string }

type ToServiceOperationsArgs = {
  context: GenerateContextType
  config: SdkConfig
  stem: string
  resource: string[]
  resolveEnrichment: (operation: OasOperation) => SdkOperationEnrichment
}

/**
 * Self-contained build (§E-6): rescans the document for every operation
 * whose enrichment resource matches — a two-op resource builds whole on the
 * first insert; the second insert hits the cache.
 */
export const toServiceOperations = ({
  context,
  config,
  stem,
  resource,
  resolveEnrichment
}: ToServiceOperationsArgs): SdkServiceOperation[] => {
  invariant(context.document.type === 'oas', '@skmtc/gen-kotlin-sdk: OAS documents only')

  const resourceKey = resource.join('/')

  return context.document.value.operations.flatMap(operation => {
    const enrichment = resolveEnrichment(operation)

    if (!enrichment || enrichment.resource.join('/') !== resourceKey) {
      return []
    }

    return [toServiceOperation({ operation, enrichment, config, stem })]
  })
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

  // Side-effect-free param facts the service-method shape needs, read
  // by the same rules the Params producers carry (no producer
  // construction here — that would register imports into the Params
  // file). The positionally-settable path param is the template-last
  // one; earlier path params are construction-required.
  const bodyShape = toBodyShape(operation, config)
  const pathParamName = lastPathParamName(operation, config)
  const hasRequired = paramsHaveRequired(operation) || bodyHasRequired(bodyShape)

  const schema = operation.toSuccessResponse()?.resolve().toSchema()?.resolve()
  const envelope = config.sharedModels.envelope
  const responseIsEnvelope = envelope
    ? !schema ||
      schema.type !== 'object' ||
      Object.keys(schema.properties ?? {}).every(name => new Set(envelope.fields).has(name))
    : false

  const resourceDir = enrichment.resource.join('').toLowerCase()

  return {
    methodName,
    paramsClassName: `${stem}${pascalMethod}Params`,
    responseClassName:
      responseIsEnvelope && envelope ? envelope.className : `${stem}${pascalMethod}Response`,
    responseIsEnvelope,
    modelsSubpackage: config.modelsLayout === 'flat' ? 'models' : `models.${resourceDir}`,
    description: operation.description ?? operation.summary ?? '',
    httpVerb: operation.method.toUpperCase(),
    path: operation.path,
    pathSegments: toPathSegments(operation.path),
    pathParam: pathParamName ? { kotlinName: pathParamName } : undefined,
    hasNone: !hasRequired,
    bodyKind:
      bodyShape === undefined ? undefined : bodyShape.kind === 'map' ? 'optional' : 'required'
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

/** `<Stem>Service` / `<Stem>ServiceAsync`. */
export const toServiceName = (stem: string, flavor: ServiceFlavor): string =>
  `${stem}Service${flavor === 'async' ? 'Async' : ''}`

/** `<Stem>ServiceImpl` / `<Stem>ServiceAsyncImpl`. */
export const toServiceImplName = (stem: string, flavor: ServiceFlavor): string =>
  `${toServiceName(stem, flavor)}Impl`

/** Adds params/response model imports for every operation, shared by both
 * the interface and impl files. */
export const addModelImports = (
  operations: SdkServiceOperation[],
  basePackage: string,
  imports: Record<string, string[]>
): void => {
  for (const operation of operations) {
    const resourceModule = `${basePackage}.${operation.modelsSubpackage}`
    const names = (imports[resourceModule] ??= [])

    if (!names.includes(operation.paramsClassName)) {
      names.push(operation.paramsClassName)
    }

    if (operation.responseIsEnvelope) {
      const rootNames = (imports[`${basePackage}.models`] ??= [])

      if (!rootNames.includes(operation.responseClassName)) {
        rootNames.push(operation.responseClassName)
      }
    } else if (!names.includes(operation.responseClassName)) {
      names.push(operation.responseClassName)
    }

    names.sort()
  }
}
