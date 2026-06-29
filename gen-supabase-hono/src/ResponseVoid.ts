import type { ListObject } from '@skmtc/lang-typescript'
import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

type ResponseVoidArgs = {
  context: GenerateContextType
  serviceName: string
  serviceArgs: ListObject<string>
}

export class ResponseVoid extends SnippetBase {
  serviceName: string
  serviceArgs: ListObject<string>

  constructor({ context, serviceName, serviceArgs }: ResponseVoidArgs) {
    super({ context })

    this.serviceName = serviceName
    this.serviceArgs = serviceArgs
  }

  override toString(): string {
    return `    await ${this.serviceName}(${this.serviceArgs})()
      
    return c.body(null, 204)`
  }
}
