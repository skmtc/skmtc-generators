import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey } from '@skmtc/core'

type ApiErrorArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey | undefined
  name: string
}

/**
 * The body of the error class every generated function throws on a non-2xx
 * response. Named by toErrorClassName.
 */
export class ApiError extends TsSnippet {
  name: string

  constructor({ context, generatorKey, name }: ApiErrorArgs) {
    super({ context, generatorKey })

    this.name = name
  }

  override toString(): string {
    return `extends Error {
  status: number
  body: string

  constructor(status: number, body: string) {
    super(\`Request failed with status \${status}: \${body}\`)
    this.name = ${JSON.stringify(this.name)}
    this.status = status
    this.body = body
  }
}`
  }
}
