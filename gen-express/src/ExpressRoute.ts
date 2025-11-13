import { camelCase, ContentBase, decapitalize, toPathParams, List } from '@skmtc/core'
import type { GenerateContextType, OasOperation, ListObject } from '@skmtc/core'
import { RequestBody } from './RequestBody.ts'
import { Response } from './Response.ts'
import { ResponseVoid } from './ResponseVoid.ts'
import { toFirstSegment } from './toFirstSegment.ts'

type ExpressRouteArgs = {
  context: GenerateContextType
  operation: OasOperation
  destinationPath: string
}

export class ExpressRoute extends ContentBase {
  operation: OasOperation
  pathParams: ListObject<string>
  queryParams: ListObject<string>
  requestBody: RequestBody
  response: Response | ResponseVoid
  withAuth: boolean
  serviceName: string

  constructor({ context, operation, destinationPath }: ExpressRouteArgs) {
    super({ context })

    this.operation = operation

    const pathName = camelCase(operation.path, { upperFirst: true })
    this.serviceName = decapitalize(`${operation.method}${pathName}Service`)

    // Extract parameters
    const pathParams = operation.toParams(['path']).map(({ name }) => name)
    const queryParams = operation.toParams(['query']).map(({ name }) => name)

    this.pathParams = List.toObject(pathParams)
    this.queryParams = List.toObject(queryParams)

    const combinedParams = List.toObject(pathParams.concat(queryParams))

    // Handle request body
    const requestBodySchema = operation.toRequestBody(({ schema }) => schema)

    this.requestBody = new RequestBody({
      context,
      serviceName: this.serviceName,
      destinationPath,
      requestBodySchema
    })

    // Check for auth
    this.withAuth =
      operation.security
        ?.flatMap(sec => sec.toSecurityScheme())
        ?.some(sc => sc.type === 'http' && sc.scheme.toLowerCase() === 'bearer') ?? false

    // Build service arguments
    const args = []

    if (requestBodySchema) {
      args.push(`body`)
    }

    if (combinedParams.values.length > 0) {
      args.push(`params: ${combinedParams}`)
    }

    const serviceArgs = List.toObject(args)

    // Handle response
    const responseSchema = operation.toSuccessResponse()?.resolve().toSchema()
    const hasResponse = Boolean(responseSchema)

    this.response = hasResponse
      ? new Response({ context, serviceName: this.serviceName, serviceArgs })
      : new ResponseVoid({ context, serviceName: this.serviceName, serviceArgs })

    // Register imports for services
    const firstSegment = toFirstSegment(operation)

    context.register({
      imports: {
        [`@/${firstSegment}/services.ts`]: [this.serviceName]
      },
      destinationPath
    })

    // Register auth middleware if needed
    if (this.withAuth) {
      context.register({
        imports: {
          '@/_shared/middleware.ts': ['authMiddleware']
        },
        destinationPath
      })
    }
  }

  override toString(): string {
    const { method, path } = this.operation

    return `app.${method}('${toPathParams(path)}', ${
      this.withAuth ? 'authMiddleware,' : ''
    } async (req: Request, res: Response, next: NextFunction) => {
  try {
    ${this.pathParams.values.length > 0 ? `const ${this.pathParams} = req.params` : ''}
    ${this.queryParams.values.length > 0 ? `const ${this.queryParams} = req.query` : ''}

    ${this.requestBody}

    ${this.response}
  } catch (error) {
    next(error)
  }
})`
  }
}
