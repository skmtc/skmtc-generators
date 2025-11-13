import { ContentBase } from '@skmtc/core'
import type { GenerateContextType, ListObject } from '@skmtc/core'

type ResponseArgs = {
  context: GenerateContextType
  serviceName: string
  serviceArgs: ListObject<string>
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
    return `const result = await ${this.serviceName}(${this.serviceArgs})()

    if (!result) {
      return res.status(404).send()
    }

    res.json(result)`
  }
}
