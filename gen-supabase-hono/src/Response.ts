import { ContentBase } from '@skmtc/core'
import type { GenerateContext, OasSchema, OasRef } from '@skmtc/core'

type ResponseArgs = {
  context: GenerateContext
  responseSchema: OasSchema | OasRef<'schema'> | undefined
}

export class Response extends ContentBase {
  hasResponse: boolean

  constructor({ context, responseSchema }: ResponseArgs) {
    super({ context })

    this.hasResponse = Boolean(responseSchema)
  }

  override toString(): string {
    if (!this.hasResponse) {
      return 'return c.body(null, 204)'
    }

    return `
    if(!res){
      return c.body(null, 404)
    }

    return c.json(res)
`
  }
}
