import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType, GeneratorKey, OasOperation, OasSchema, OasRef } from '@skmtc/core'
import { toClientPath } from './resource.ts'
import { toTsType, type AnySchema } from './toTsType.ts'
import { toJsDoc } from './toJsDoc.ts'

type Schema = OasSchema | OasRef<'schema'>

type ApiMethodArgs = {
  context: GenerateContextType
  generatorKey?: GeneratorKey
  operation: OasOperation
  methodName: string
  resourceClassName: string
  schemaNames: Record<string, string>
}

/**
 * One method on a resource class — the JSDoc, signature and `this._client`
 * call for a single operation. Mirrors the Stainless method shape: path
 * params become leading positional args, a request body a `body` param, a
 * list-shaped response a `getAPIList` / `PagePromise`, everything else an
 * `APIPromise`.
 *
 * Exposes the cross-cutting facts the parent {@link SdkResource} aggregates:
 * the runtime {@link imports} the method needs, the schema {@link typeRoots}
 * whose named types get inlined, and any {@link pageAlias}.
 */
export class ApiMethod extends SnippetBase {
  imports: Record<string, string[]>
  /** Response / body / page-item schemas whose named types the resource inlines. */
  typeRoots: AnySchema[]
  /** When the method paginates: the `<Resource>Page` alias + its item type. */
  pageAlias: { name: string; itemType: string } | undefined

  #jsDoc: string
  #signature: string
  #body: string

  constructor({ context, generatorKey, operation, methodName, resourceClassName, schemaNames }: ApiMethodArgs) {
    super({ context, generatorKey })

    this.imports = {}
    this.typeRoots = []
    this.pageAlias = undefined

    const httpMethod = operation.method
    const { expression: pathExpression, hasParams } = toClientPath(operation.path)
    const pathParameters = operation.toParams(['path']).map(({ name }) => `${name}: string`)
    const description = 'description' in operation ? operation.description : undefined

    this.#jsDoc = description ? `${toJsDoc(description)}\n` : ''

    this.#addImport('../internal/request-options', 'RequestOptions')
    if (hasParams) {
      this.#addImport('../internal/utils/path', 'path')
    }

    const successSchema = operation.toSuccessResponse()?.resolve().toSchema()
    const pagination = successSchema ? this.#toPagination(successSchema, resourceClassName, schemaNames) : undefined

    // 1. Paginated list — the item type is inlined, not the list wrapper.
    if (pagination) {
      this.pageAlias = { name: pagination.pageName, itemType: pagination.itemType }
      this.typeRoots.push(pagination.itemSchema)
      this.#addImport('../core/pagination', 'Page', 'PagePromise')
      this.#signature = `${methodName}(options?: RequestOptions): PagePromise<${pagination.pageName}, ${pagination.itemType}>`
      this.#body = `return this._client.getAPIList(${pathExpression}, Page<${pagination.itemType}>, { ...options, __security: { bearerAuth: true } });`
      return
    }

    this.#addImport('../core/api-promise', 'APIPromise')
    const responseType = successSchema ? toTsType(successSchema, schemaNames) : 'void'
    if (successSchema) {
      this.typeRoots.push(successSchema)
    }

    // 2. Request-body method (create / update).
    const requestBody = operation.toRequestBody(({ schema }) => schema)
    if (requestBody) {
      this.typeRoots.push(requestBody)
      const parameterList = [
        ...pathParameters,
        `body: ${toTsType(requestBody, schemaNames)}`,
        'options?: RequestOptions'
      ].join(', ')
      this.#signature = `${methodName}(${parameterList}): APIPromise<${responseType}>`
      this.#body = `return this._client.${httpMethod}(${pathExpression}, { body, ...options, __security: { bearerAuth: true } });`
      return
    }

    // 3. Plain (GET / DELETE, no body).
    const parameterList = [...pathParameters, 'options?: RequestOptions'].join(', ')
    this.#signature = `${methodName}(${parameterList}): APIPromise<${responseType}>`
    this.#body = `return this._client.${httpMethod}(${pathExpression}, { ...options, __security: { bearerAuth: true } });`
  }

  #addImport(module: string, ...names: string[]): void {
    this.imports[module] = [...(this.imports[module] ?? []), ...names]
  }

  /**
   * A list-shaped success response (`{ object: 'list', data: T[] }`) becomes
   * pagination: the item type is `data`'s element, the page alias
   * `<Resource>Page`.
   */
  #toPagination(
    schema: Schema,
    resourceClassName: string,
    schemaNames: Record<string, string>
  ): { pageName: string; itemType: string; itemSchema: AnySchema } | undefined {
    const object = schema.isRef() ? schema.resolve() : schema
    if (object.type !== 'object') return undefined

    const data = object.properties?.['data']
    const objectProp = object.properties?.['object']
    const isList =
      data?.type === 'array' &&
      objectProp?.type === 'string' &&
      Array.isArray(objectProp.enums) &&
      objectProp.enums.includes('list')

    if (!isList || data?.type !== 'array') return undefined

    return {
      pageName: `${resourceClassName}Page`,
      itemType: toTsType(data.items, schemaNames),
      itemSchema: data.items
    }
  }

  override toString(): string {
    return `${this.#jsDoc}${this.#signature} {
    ${this.#body}
  }`
  }
}
