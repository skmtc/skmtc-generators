import { ContentBase, decapitalize } from '@skmtc/core'
import type { GenerateContextType, OasSchema, OasRef } from '@skmtc/core'
import { ValibotInsertable } from '@skmtc/gen-valibot'

type RequestBodyArgs = {
  context: GenerateContextType
  serviceName: string
  destinationPath: string
  requestBodySchema: OasSchema | OasRef<'schema'> | undefined
}

export class RequestBody extends ContentBase {
  valibotRequestBodyName: string | null

  constructor({ context, serviceName, destinationPath, requestBodySchema }: RequestBodyArgs) {
    super({ context })

    if (!requestBodySchema) {
      this.valibotRequestBodyName = null
      return
    }

    const insertedRequestBody = context.insertNormalisedModel(ValibotInsertable, {
      schema: requestBodySchema,
      fallbackName: decapitalize(`${serviceName}RequestBody`),
      destinationPath
    })

    this.valibotRequestBodyName = insertedRequestBody.identifier.name

    // Register valibot import
    context.register({
      imports: {
        valibot: ['*', 'v']
      },
      destinationPath
    })
  }

  override toString(): string {
    if (this.valibotRequestBodyName === null) {
      return ''
    }

    return `const body = v.parse(${this.valibotRequestBodyName}, req.body)`
  }
}
