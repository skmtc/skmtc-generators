import { ContentBase } from '@skmtc/core'
import type { GenerateContext, ListObject } from '@skmtc/core'

type ResponseArgs = {
  context: GenerateContext
  serviceName: string
  serviceArgs: ListObject<string>
  destinationPath: string
}

export class Response extends ContentBase {
  serviceName: string
  serviceArgs: ListObject<string>

  constructor({ context, serviceName, serviceArgs }: ResponseArgs) {
    super({ context })

    this.serviceName = serviceName
    this.serviceArgs = serviceArgs
  }

  override toString(): string {
    return `const res = await ${this.serviceName}(${this.serviceArgs})()

    if(!res){
      return c.body(null, 404)
    }

    return c.json(res)
`
  }
}
