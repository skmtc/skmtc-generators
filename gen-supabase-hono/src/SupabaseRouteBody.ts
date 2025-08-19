import {
  camelCase,
  capitalize,
  ContentBase,
  decapitalize,
  OasVoid,
  toMethodVerb,
  toPathParams,
  List
} from '@skmtc/core'
import type { GenerateContext, OasOperation, OasSchema, OasRef, ListObject } from '@skmtc/core'
import { TsInsertable } from '@skmtc/gen-typescript'
import { ZodInsertable } from '@skmtc/gen-zod'

type SupabaseRouteArgs = {
  context: GenerateContext
  operation: OasOperation
  destinationPath: string
  requestBodySchema: OasSchema | OasRef<'schema'>
}

export class SupabaseRouteBody extends ContentBase {
  operation: OasOperation
  tsResponseName: string
  serviceName: string
  zodRequestBodyName: string
  serviceArgs: ListObject<string>
  pathParams: ListObject<string>
  queryParams: ListObject<string>

  constructor({ context, operation, destinationPath, requestBodySchema }: SupabaseRouteArgs) {
    super({ context })

    this.operation = operation

    const pathName = camelCase(operation.path, { upperFirst: true })

    this.serviceName = decapitalize(`${toMethodVerb(operation.method)}${pathName}Api`)

    const responseSchema = operation.toSuccessResponse()?.resolve().toSchema()

    const insertedResponse = context.insertNormalisedModel(TsInsertable, {
      schema: responseSchema ?? OasVoid.empty(),
      fallbackName: capitalize(`${this.serviceName}Response`),
      destinationPath
    })

    this.tsResponseName = insertedResponse.identifier.name

    const insertedRequestBody = context.insertNormalisedModel(ZodInsertable, {
      schema: requestBodySchema,
      fallbackName: decapitalize(`${this.serviceName}RequestBody`),
      destinationPath
    })

    this.zodRequestBodyName = insertedRequestBody.identifier.name

    const pathParams = operation.toParams(['path']).map(({ name }) => name)
    const queryParams = operation.toParams(['query']).map(({ name }) => name)

    this.pathParams = List.toObject(pathParams)
    this.queryParams = List.toObject(queryParams)

    const combinedParams = List.toObject(pathParams.concat(queryParams))

    const args = ['req: c.req', 'body']

    if (combinedParams.values.length > 0) {
      args.push(`params: ${combinedParams}`)
    }

    this.serviceArgs = List.toObject(args)

    context.register({
      imports: {
        './services.ts': [this.serviceName]
      },
      destinationPath
    })
  }

  override toString(): string {
    const { method, path } = this.operation

    return `app.${method}('${toPathParams(path)}', async c => {
  console.log('${method.toUpperCase()} ${toPathParams(path)}')

  const requestBody = await c.req.json()
  const body = ${this.zodRequestBodyName}.parse(requestBody)

  ${this.pathParams.values.length > 0 ? `const ${this.pathParams} = c.req.param()` : ''}
  ${this.queryParams.values.length > 0 ? `const ${this.queryParams} = c.req.query()` : ''}

  const res: ${this.tsResponseName} = await ${this.serviceName}(${this.serviceArgs})()

  return c.json(res)
})`
  }
}
