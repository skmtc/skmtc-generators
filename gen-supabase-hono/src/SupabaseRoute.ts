import { camelCase, ContentBase, decapitalize, toPathParams, List } from '@skmtc/core'
import type { GenerateContextType, OasOperation, ListObject } from '@skmtc/core'
import { RequestBody } from './RequestBody.ts'
import { Response } from './Response.ts'
import { ResponseVoid } from './ResponseVoid.ts'
import { toFirstSegment } from './toFirstSegment.ts'

type SupabaseRouteArgs = {
  context: GenerateContextType
  operation: OasOperation
  destinationPath: string
}

export class SupabaseRoute extends ContentBase {
  operation: OasOperation
  pathParams: ListObject<string>
  queryParams: ListObject<string>
  requestBody: RequestBody
  response: Response | ResponseVoid
  withBearerAuth: boolean

  constructor({ context, operation, destinationPath }: SupabaseRouteArgs) {
    super({ context })

    this.operation = operation

    const pathName = camelCase(operation.path, { upperFirst: true })

    const serviceName = decapitalize(`${operation.method}${pathName}Api`)

    const responseSchema = operation.toSuccessResponse()?.resolve().toSchema()

    const pathParams = operation.toParams(['path']).map(({ name }) => name)
    const queryParams = operation.toParams(['query']).map(({ name }) => name)

    this.pathParams = List.toObject(pathParams)
    this.queryParams = List.toObject(queryParams)

    const combinedParams = List.toObject(pathParams.concat(queryParams))

    const requestBodySchema = operation.toRequestBody(({ schema }) => schema)

    this.requestBody = new RequestBody({
      context,
      serviceName,
      destinationPath,
      requestBodySchema
    })

    const args = [`supabase: c.get('supabase')`]

    this.withBearerAuth =
      operation.security
        ?.flatMap(sec => sec.toSecurityScheme())
        ?.some(sc => sc.type === 'http' && sc.scheme.toLowerCase() === 'bearer') ?? false

    if (this.withBearerAuth) {
      args.push(`claims: c.get('claims')`)
    }

    if (requestBodySchema) {
      args.push(`body`)
    }

    if (combinedParams.values.length > 0) {
      args.push(`params: ${combinedParams}`)
    }

    const serviceArgs = List.toObject(args)

    const hasResponse = Boolean(responseSchema)

    this.response = hasResponse
      ? new Response({ context, serviceName, serviceArgs, destinationPath })
      : new ResponseVoid({ context, serviceName, serviceArgs })

    const firstSegment = toFirstSegment(operation)

    context.register({
      imports: {
        [`@/${firstSegment}/services.ts`]: [serviceName],
        '@/_shared/middleware.ts': ['withSupabase']
      },
      destinationPath
    })

    if (this.withBearerAuth) {
      context.register({
        imports: { '@/_shared/middleware.ts': ['withClaims'] },
        destinationPath
      })
    }
  }

  override toString(): string {
    const { method, path } = this.operation

    return `app.${method}('${toPathParams(path)}', withSupabase, ${
      this.withBearerAuth ? 'withClaims,' : ''
    } async c => {
  console.log('${method} ${toPathParams(path)}')

  ${this.pathParams.values.length > 0 ? `const ${this.pathParams} = c.req.param()` : ''}
  ${this.queryParams.values.length > 0 ? `const ${this.queryParams} = c.req.query()` : ''}

  ${this.requestBody}

  ${this.response}
})`
  }
}
