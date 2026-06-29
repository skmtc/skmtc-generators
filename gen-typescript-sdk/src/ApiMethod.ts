import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType, GeneratorKey } from '@skmtc/core'
import { toJsDoc } from './toJsDoc.ts'

/** Pagination shape for a `list` method. */
export type Pagination = { pageName: string; itemType: string }

export type ApiMethodArgs = {
  context: GenerateContextType
  generatorKey?: GeneratorKey
  methodName: string
  httpMethod: string
  /** Path expression — `path\`/x/${id}\`` or `'/x'`. */
  pathExpression: string
  hasParams: boolean
  /** Leading positional params, e.g. `['model: string']`. */
  pathParameters: string[]
  description: string | undefined
  /** Response type name (e.g. `Model`), or `void`. */
  responseType: string
  /** Request-body type name, when the operation has a body. */
  bodyType: string | undefined
  pagination: Pagination | undefined
}

/**
 * One method on a resource class — pure rendering. The type *names* are
 * resolved by {@link SdkResource} (composing with `gen-typescript-s`); this
 * snippet just lays out the JSDoc, signature and `this._client` call, and
 * exposes the runtime {@link imports} it needs.
 */
export class ApiMethod extends SnippetBase {
  imports: Record<string, string[]>
  #text: string

  constructor(args: ApiMethodArgs) {
    super({ context: args.context, generatorKey: args.generatorKey })

    this.imports = {}
    this.#addImport('../internal/request-options', 'RequestOptions')
    if (args.hasParams) {
      this.#addImport('../internal/utils/path', 'path')
    }

    const jsDoc = args.description ? `${toJsDoc(args.description)}\n` : ''

    if (args.pagination) {
      this.#addImport('../core/pagination', 'Page', 'PagePromise')
      const signature = `${args.methodName}(options?: RequestOptions): PagePromise<${args.pagination.pageName}, ${args.pagination.itemType}>`
      const body = `return this._client.getAPIList(${args.pathExpression}, Page<${args.pagination.itemType}>, { ...options, __security: { bearerAuth: true } });`
      this.#text = `${jsDoc}${signature} {\n    ${body}\n  }`
      return
    }

    this.#addImport('../core/api-promise', 'APIPromise')

    const parameters = args.bodyType
      ? [...args.pathParameters, `body: ${args.bodyType}`, 'options?: RequestOptions']
      : [...args.pathParameters, 'options?: RequestOptions']
    const payload = args.bodyType
      ? '{ body, ...options, __security: { bearerAuth: true } }'
      : '{ ...options, __security: { bearerAuth: true } }'

    const signature = `${args.methodName}(${parameters.join(', ')}): APIPromise<${args.responseType}>`
    const body = `return this._client.${args.httpMethod}(${args.pathExpression}, ${payload});`
    this.#text = `${jsDoc}${signature} {\n    ${body}\n  }`
  }

  #addImport(module: string, ...names: string[]): void {
    this.imports[module] = [...(this.imports[module] ?? []), ...names]
  }

  override toString(): string {
    return this.#text
  }
}
