import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

type ResponseVoidArgs = {
  context: GenerateContextType
}

/** Execute the request; the document gives its response no body to read. */
export class ResponseVoid extends SnippetBase {
  constructor({ context }: ResponseVoidArgs) {
    super({ context })
  }

  override toString(): string {
    return 'yield* client.execute(request);'
  }
}
