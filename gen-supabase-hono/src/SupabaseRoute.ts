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
import type { GenerateContext, OasOperation, ListObject } from '@skmtc/core'
import { TsInsertable } from '@skmtc/gen-typescript'

type SupabaseRouteArgs = {
  context: GenerateContext
  operation: OasOperation
  destinationPath: string
}

export class SupabaseRoute extends ContentBase {
  operation: OasOperation
  tsResponseName: string
  serviceName: string
  serviceArgs: ListObject<string>
  pathParams: ListObject<string>
  queryParams: ListObject<string>

  constructor({ context, operation, destinationPath }: SupabaseRouteArgs) {
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

    const pathParams = operation.toParams(['path']).map(({ name }) => name)
    const queryParams = operation.toParams(['query']).map(({ name }) => name)

    this.pathParams = List.toObject(pathParams)
    this.queryParams = List.toObject(queryParams)

    const combinedParams = List.toObject(pathParams.concat(queryParams))

    const args = ['req: c.req']

    if (combinedParams.values.length > 0) {
      args.push(`params: ${combinedParams}`)
    }

    this.serviceArgs = List.toObject(args)

    this.tsResponseName = insertedResponse.identifier.name

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
  console.log('${method} ${toPathParams(path)}')

  ${this.pathParams.values.length > 0 ? `const ${this.pathParams} = c.req.param()` : ''}
  ${this.queryParams.values.length > 0 ? `const ${this.queryParams} = c.req.query()` : ''}

  const res: ${this.tsResponseName} = await ${this.serviceName}(${this.serviceArgs})()

  return c.json(res)
})`
  }
}
