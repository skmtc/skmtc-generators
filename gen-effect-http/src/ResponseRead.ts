import type { GenerateContextType } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'

type ResponseReadArgs = {
  context: GenerateContextType
  destinationPath: string
  /** The Effect schema the response body is decoded with. */
  schemaName: string
}

/** Execute the request and decode its body with the response schema. */
export class ResponseRead extends TsSnippet {
  schemaName: string

  constructor({ context, destinationPath, schemaName }: ResponseReadArgs) {
    super({ context })

    this.schemaName = schemaName

    // Imported only where a body is read, so a bodiless endpoint's file
    // carries no unused import.
    this.register({
      imports: { 'effect/unstable/http': ['HttpClientResponse'] },
      destinationPath,
    })
  }

  override toString(): string {
    return `const response = yield* client.execute(request);
    return yield* HttpClientResponse.schemaBodyJson(${this.schemaName})(response);`
  }
}
