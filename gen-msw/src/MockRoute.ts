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

/** The data a JSON example holds: `dataValue`, then `value`, then the parsed `serializedValue`. */
const toExampleData = (example: OasExample | undefined): unknown => {
  if (example?.dataValue !== undefined) {
    return example.dataValue
  }

  if (example?.value !== undefined) {
    return example.value
  }

  if (example?.serializedValue === undefined) {
    return undefined
  }

  try {
    return JSON.parse(example.serializedValue)
  } catch {
    return undefined
  }
}

export class MockRoute extends MswBase {
  responseData: unknown
  requestBodyType: TypeSystemValue
  responseType: TypeSystemValue
  pathParamsType: TypeSystemValue

  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const response = operation.toSuccessResponse()?.resolve().content?.['application/json']

    const example = toExampleData(Object.values(response?.examples ?? {})[0]?.resolve())

    this.responseData = example ?? collateExamples({ objectSchema: response?.schema, depth: 0 })

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

    this.responseType = response?.schema
      ? toTsValue({
          context,
          schema: response.schema,
          destinationPath: settings.exportPath,
          required: true,
          rootRef: response.schema.isRef() ? response.schema.toRefName() : undefined
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

    return `http.${method}<${this.pathParamsType}, ${this.requestBodyType}, ${
      this.responseType
    }>('${route}', () => {
  return HttpResponse.json(${JSON.stringify(this.responseData, null, 2)})
})`
  }
}
