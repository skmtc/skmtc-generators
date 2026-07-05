import type { GenerateContextType, GeneratorKey, StackTrail } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import { wrapDescription } from './wrapDescription.ts'

/** Pagination shape for a `list` method. */
export type Pagination = { pageName: string; itemType: string }

export type ApiMethodArgs = {
  context: GenerateContextType
  /** The file the method is rendered into — where its runtime imports register. */
  destinationPath: string
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
  /** Binary-download success response: returns the global `Response`, sends an
   *  `application/binary` Accept header + `__binaryResponse: true`, no named type. */
  binaryResponse: boolean | undefined
  /** Leading `const { … } = params;` for the params-object pattern (≥2 path
   *  params): the parent path params arrive via a `params` object and are
   *  destructured before the call. Prepended to the method body. */
  destructure: string | undefined
  /** The `__security` scheme key (from the op's OpenAPI security). Defaults to
   *  `bearerAuth` when absent. */
  securityScheme: string | undefined
  /** Optional attribution (gen-maps) inputs. */
  generatorKey?: GeneratorKey
  stackTrail?: StackTrail
}

/**
 * The shape of one resource-class method, derived from an operation: its
 * parameter list, return type, body and JSDoc. A {@link TsSnippet} (a leaf
 * entity): it registers the runtime imports it needs into `destinationPath`
 * (the resource file). {@link SdkResource} builds a `TsMethod` from the
 * computed facts — `TsMethod` does the rendering, this owns the imports.
 */
export class ApiMethod extends TsSnippet {
  parameters: string[]
  returnType: string
  body: string
  /** JSDoc text, wrapped at 80 columns — no comment markers; `TsMethod` adds the gutter. */
  description: string | undefined

  constructor(args: ApiMethodArgs) {
    super({ context: args.context, generatorKey: args.generatorKey, stackTrail: args.stackTrail })

    const { destinationPath } = args

    this.register({ imports: { '@/internal/request-options': ['RequestOptions'] }, destinationPath })
    if (args.hasParams) {
      this.register({ imports: { '@/internal/utils/path': ['path'] }, destinationPath })
    }

    this.description = args.description ? wrapDescription(args.description) : undefined

    const securityKey = args.securityScheme ?? 'bearerAuth'

    if (args.pagination) {
      this.register({ imports: { '@/core/pagination': ['Page', 'PagePromise'] }, destinationPath })
      this.parameters = ['options?: RequestOptions']
      this.returnType = `PagePromise<${args.pagination.pageName}, ${args.pagination.itemType}>`
      this.body = `return this._client.getAPIList(${args.pathExpression}, Page<${args.pagination.itemType}>, { ...options, __security: { ${securityKey}: true } });`
    } else {
      this.register({ imports: { '@/core/api-promise': ['APIPromise'] }, destinationPath })
      if (args.binaryResponse) {
        this.register({ imports: { '@/internal/headers': ['buildHeaders'] }, destinationPath })
      }
      this.parameters = args.bodyType
        ? [...args.pathParameters, `body: ${args.bodyType}`, 'options?: RequestOptions']
        : [...args.pathParameters, 'options?: RequestOptions']
      const payload = `{ ${[
        args.bodyType ? 'body' : undefined,
        '...options',
        args.binaryResponse
          ? "headers: buildHeaders([{ Accept: 'application/binary' }, options?.headers])"
          : undefined,
        `__security: { ${securityKey}: true }`,
        args.binaryResponse ? '__binaryResponse: true' : undefined
      ]
        .filter(Boolean)
        .join(', ')} }`
      this.returnType = `APIPromise<${args.responseType}>`
      this.body = `return this._client.${args.httpMethod}(${args.pathExpression}, ${payload});`
    }

    if (args.destructure) {
      this.body = `${args.destructure}\n${this.body}`
    }
  }
}
