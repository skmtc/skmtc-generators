import {
  type OasExample,
  type OasOperationProjectionConstructorArgs,
  type TypeSystemValue,
  collateExamples
} from '@skmtc/core'
import { MswBase } from './base.ts'
import { isEmpty } from '@skmtc/core'
import { toTsValue, TsNever } from '@skmtc/gen-typescript'
import type { EnrichmentSchema } from './enrichments.ts'

/**
 * The data a JSON example holds: `dataValue`, then `value`, then the parsed
 * `serializedValue`. Wrapped so that an explicit `null` example is kept
 * rather than read as "no example".
 */
const toExampleData = (example: OasExample | undefined): { data: unknown } | undefined => {
  if (example?.dataValue !== undefined) {
    return { data: example.dataValue }
  }

  if (example?.value !== undefined) {
    return { data: example.value }
  }

  if (example?.serializedValue === undefined) {
    return undefined
  }

  try {
    return { data: JSON.parse(example.serializedValue) }
  } catch {
    return undefined
  }
}

export class MockRoute extends MswBase {
  responseData: unknown
  requestBodyType: TypeSystemValue
  responseType: TypeSystemValue
  pathParamsType: TypeSystemValue
  /** The `Content-Type` to send, when it is not the `application/json` that `HttpResponse.json` sets. */
  contentType: string | undefined

  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const resolved = operation.toSuccessResponse()?.resolve()
    const json = resolved?.toJsonContent()
    const schema = json?.schema
    const mediaTypeObject = json ? resolved?.content?.[json.mediaType] : undefined

    this.contentType = json && json.contentType !== 'application/json' ? json.contentType : undefined

    const example = toExampleData(Object.values(mediaTypeObject?.examples ?? {})[0]?.resolve())

    this.responseData = example ? example.data : collateExamples({ objectSchema: schema, depth: 0 })

    this.requestBodyType =
      operation.toRequestBody(({ schema }) => {
        return toTsValue({
          context,
          schema,
          destinationPath: settings.exportPath,
          required: true,
          rootRef: schema.isRef() ? schema.toRefName() : undefined
        })
      }) ?? new TsNever({ context, generatorKey: this.generatorKey })

    const pathParams = operation.toParametersObject(['path'])

    const isPathParamsEmpty = isEmpty(pathParams?.properties ?? {})

    this.pathParamsType = isPathParamsEmpty
      ? new TsNever({ context, generatorKey: this.generatorKey })
      : toTsValue({
          context,
          schema: pathParams,
          destinationPath: settings.exportPath,
          required: true
        })

    this.responseType = schema
      ? toTsValue({
          context,
          schema,
          destinationPath: settings.exportPath,
          required: true,
          rootRef: schema.isRef() ? schema.toRefName() : undefined
        })
      : new TsNever({ context, generatorKey: this.generatorKey })

    this.register({
      imports: {
        msw: ['http', 'HttpResponse']
      }
    })
  }

  override toString(): string {
    const { method, path } = this.operation

    const route = `${path.replaceAll(/{([^}]*)}/g, ':$1')}`

    const init = this.contentType
      ? `, { headers: { 'Content-Type': ${JSON.stringify(this.contentType)} } }`
      : ''

    return `http.${method}<${this.pathParamsType}, ${this.requestBodyType}, ${
      this.responseType
    }>('${route}', () => {
  return HttpResponse.json(${JSON.stringify(this.responseData, null, 2)}${init})
})`
  }
}
