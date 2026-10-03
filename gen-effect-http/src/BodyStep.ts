import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

type BodyStepArgs = {
  context: GenerateContextType
  /** The Effect schema the body is encoded with. */
  schemaName: string
}

/** `HttpClientRequest.schemaBodyJson(Body)(body)` — the JSON body, encoded with its schema. */
export class BodyStep extends SnippetBase {
  schemaName: string

  constructor({ context, schemaName }: BodyStepArgs) {
    super({ context })

    this.schemaName = schemaName
  }

  override toString(): string {
    return `HttpClientRequest.schemaBodyJson(${this.schemaName})(body)`
  }
}
