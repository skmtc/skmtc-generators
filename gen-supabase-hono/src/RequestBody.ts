import { ContentBase, decapitalize } from '@skmtc/core'
import type { GenerateContextType, OasSchema, OasRef } from '@skmtc/core'
import { ZodInsertable } from '@skmtc/gen-zod'

type RequestBodyArgs = {
  context: GenerateContextType
  serviceName: string
  destinationPath: string
  requestBodySchema: OasSchema | OasRef<'schema'> | undefined
}

export class RequestBody extends ContentBase {
  zodRequestBodyName: string | null

  constructor({ context, serviceName, destinationPath, requestBodySchema }: RequestBodyArgs) {
    super({ context })

    if (!requestBodySchema) {
      this.zodRequestBodyName = null

      return
    }

    const insertedRequestBody = context.insertNormalisedModel(ZodInsertable, {
      schema: requestBodySchema,
      fallbackName: decapitalize(`${serviceName}RequestBody`),
      destinationPath
    })

    this.zodRequestBodyName = insertedRequestBody.identifier.name
  }

  override toString(): string {
    if (this.zodRequestBodyName === null) {
      return ''
    }

    return `  const requestBody = await c.req.json()
  const body = ${this.zodRequestBodyName}.parse(requestBody)
`
  }
}
