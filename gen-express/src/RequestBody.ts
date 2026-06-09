import { decapitalize } from '@skmtc/core'
import { TypescriptSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, OasSchema, OasRef } from '@skmtc/core'
import { ValibotProjection } from '@skmtc/gen-valibot'

type RequestBodyArgs = {
  context: GenerateContextType
  serviceName: string
  destinationPath: string
  requestBodySchema: OasSchema | OasRef<'schema'> | undefined
}

export class RequestBody extends TypescriptSnippet {
  valibotRequestBodyName: string | null

  constructor({ context, serviceName, destinationPath, requestBodySchema }: RequestBodyArgs) {
    super({ context })

    if (!requestBodySchema) {
      this.valibotRequestBodyName = null
      return
    }

    const insertedRequestBody = context.insertNormalizedModel(ValibotProjection, {
      schema: requestBodySchema,
      fallbackName: decapitalize(`${serviceName}RequestBody`),
      destinationPath
    })

    this.valibotRequestBodyName = insertedRequestBody.identifier.name

    // Register valibot import
    this.register({
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
