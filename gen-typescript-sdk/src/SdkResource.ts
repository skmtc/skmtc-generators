import { CustomValue } from '@skmtc/core'
import type { OasOperationProjectionConstructorArgs, OasOperation } from '@skmtc/core'
import { defineAndRegister, createType } from '@skmtc/lang-typescript'
import { TsProjection } from '@skmtc/gen-typescript-s'
import { SdkResourceBase } from './base.ts'
import { ApiMethod } from './ApiMethod.ts'
import { toClientPath, toPagination } from './resource.ts'
import type { EnrichmentSchema } from './enrichments.ts'

// Stainless's canonical method ordering; anything unlisted sorts after.
const METHOD_ORDER = ['create', 'retrieve', 'update', 'list', 'delete']
const methodPriority = (name: string): number => {
  const index = METHOD_ORDER.indexOf(name)
  return index === -1 ? METHOD_ORDER.length : index
}

/**
 * One resource file, accumulated across every operation carrying the same
 * `resource` enrichment. Renders the `export class <Name> extends
 * APIResource { … }` (kind `class`); the request/response/item **types** are
 * composed from `@skmtc/gen-typescript-s` via {@link insertNormalizedModel}
 * — co-located into this file (or imported, per their `exportPath`
 * enrichment), named/renamed by that generator's `toIdentifierName`.
 */
export class SdkResource extends SdkResourceBase {
  description: string | undefined

  #methods: { apiMethod: ApiMethod; methodName: string }[] = []
  #pageAliases = new Set<string>()

  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    this.description = settings.enrichments.subject?.resourceDescription
    this.register({ imports: { '../core/resource': ['APIResource'] } })

    const fileHeader = settings.enrichments.generator?.fileHeader
    if (fileHeader) {
      this.register({ banner: fileHeader })
    }
  }

  append(operation: OasOperation, methodName: string): void {
    const className = this.settings.identifier.name
    const { expression: pathExpression, hasParams } = toClientPath(operation.path)
    const pathParameters = operation.toParams(['path']).map(({ name }) => `${name}: string`)
    const description = 'description' in operation ? operation.description : undefined

    const successSchema = operation.toSuccessResponse()?.resolve().toSchema()
    const requestBody = operation.toRequestBody(({ schema }) => schema)
    const pagination = successSchema ? toPagination(successSchema) : undefined

    let responseType = 'void'
    let bodyType: string | undefined
    let paginationInfo: { pageName: string; itemType: string } | undefined

    if (pagination) {
      const itemType = this.insertNormalizedModel(TsProjection, {
        schema: pagination.itemSchema,
        fallbackName: `${className}Item`
      }).identifier.name
      const pageName = `${className}Page`
      paginationInfo = { pageName, itemType }
      this.#ensurePageAlias(pageName, itemType)
    } else {
      if (successSchema) {
        responseType = this.insertNormalizedModel(TsProjection, {
          schema: successSchema,
          fallbackName: `${className}Response`
        }).identifier.name
      }
      if (requestBody) {
        bodyType = this.insertNormalizedModel(TsProjection, {
          schema: requestBody,
          fallbackName: `${className}Params`
        }).identifier.name
      }
    }

    const apiMethod = new ApiMethod({
      context: this.context,
      generatorKey: this.generatorKey,
      methodName,
      httpMethod: operation.method,
      pathExpression,
      hasParams,
      pathParameters,
      description,
      responseType,
      bodyType,
      pagination: paginationInfo
    })

    this.#methods.push({ apiMethod, methodName })
    this.register({ imports: apiMethod.imports })
  }

  /** The `export type <Resource>Page = Page<Item>` alias, once per resource. */
  #ensurePageAlias(pageName: string, itemType: string): void {
    if (this.#pageAliases.has(pageName)) return
    this.#pageAliases.add(pageName)

    defineAndRegister(this.context, {
      identifier: createType(pageName),
      value: new CustomValue({ context: this.context, value: `Page<${itemType}>` }),
      destinationPath: this.settings.exportPath
    })
    this.register({ imports: { '../core/pagination': ['Page'] } })
  }

  override toString(): string {
    const methods = [...this.#methods]
      .sort((a, b) => methodPriority(a.methodName) - methodPriority(b.methodName))
      .map(({ apiMethod }) => apiMethod.toString())
      .join('\n\n')

    return `extends APIResource {\n${methods}\n}`
  }
}
