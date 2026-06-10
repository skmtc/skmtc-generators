import type { ListObject } from '@skmtc/lang-typescript'
import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

type ResponseArgs = {
  context: GenerateContextType
  serviceName: string
  serviceArgs: ListObject<string>
  destinationPath: string
}

export class Response extends SnippetBase {
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
