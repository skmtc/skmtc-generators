import {
  camelCase,
  capitalize,
  ContentBase,
  decapitalize,
  Identifier,
  OasVoid,
  toMethodVerb,
  toPathTemplate
} from '@skmtc/core'
import type { GenerateContext, OasOperation, OasSchema, OasRef } from '@skmtc/core'
import { toTsValue } from '@skmtc/gen-typescript'

type SupabaseRouteArgs = {
  context: GenerateContext
  operation: OasOperation
  destinationPath: string
  requestBodySchema: OasSchema | OasRef<'schema'>
}

export class SupabaseRouteBody extends ContentBase {
  operation: OasOperation
  responseName: string
  serviceName: string
  requestBodyName: string

  constructor({ context, operation, destinationPath, requestBodySchema }: SupabaseRouteArgs) {
    super({ context })

    this.operation = operation

    this.serviceName = `${toMethodVerb(operation.method)}${camelCase(operation.path, {
      upperFirst: true
    })}Api`

    const responseSchema = operation.toSuccessResponse()?.resolve().toSchema()

    const responseValue = toTsValue({
      context: this.context,
      schema: responseSchema ?? OasVoid.empty(),
      destinationPath,
      required: true,
      rootRef: responseSchema?.isRef() ? responseSchema.toRefName() : undefined
    })

    if (!responseSchema?.isRef()) {
      this.responseName = capitalize(`${this.serviceName}Response`)

      context.defineAndRegister({
        identifier: Identifier.createType(this.responseName),
        value: responseValue,
        destinationPath
      }).value
    } else {
      this.responseName = responseSchema.toRefName()
    }

    const requestBodyValue = toTsValue({
      context: this.context,
      schema: requestBodySchema,
      destinationPath,
      required: true,
      rootRef: requestBodySchema.isRef() ? requestBodySchema.toRefName() : undefined
    })

    if (!requestBodySchema.isRef()) {
      this.requestBodyName = decapitalize(`${this.serviceName}RequestBody`)

      context.defineAndRegister({
        identifier: Identifier.createType(this.requestBodyName),
        value: requestBodyValue,
        destinationPath
      }).value
    } else {
      this.requestBodyName = requestBodySchema.toRefName()
    }
  }

  override toString(): string {
    const { method, path } = this.operation

    return `app.${method}('${toPathTemplate(path)}', async c => {
  console.log('${method.toUpperCase()} ${toPathTemplate(path)}')

  const requestBody = await c.req.json()
  const body = ${this.requestBodyName}.parse(requestBody)

  const res: ${this.responseName} = await ${this.serviceName}({
    req: c.req
  })()

  return c.json(res)
})`
  }
}
