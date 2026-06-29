import type { ListObject } from '@skmtc/lang-typescript'
import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

type ResponseArgs = {
  context: GenerateContextType
  serviceName: string
  serviceArgs: ListObject<string>
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
    return `const result = await ${this.serviceName}(${this.serviceArgs})()

    if (!result) {
      return res.status(404).send()
    }

    res.json(result)`
  }
}
