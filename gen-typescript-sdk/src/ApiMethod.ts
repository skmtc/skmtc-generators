import { SnippetBase, toRefName } from '@skmtc/core'
import type { GenerateContextType, GeneratorKey, OasOperation, OasSchema, OasRef } from '@skmtc/core'
import { toClientPath } from './resource.ts'
import { toTsType, type AnySchema, type ObjectSchema } from './toTsType.ts'
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
 * params become leading positional args, a list-shaped response becomes a
 * `getAPIList` / `PagePromise`, everything else an `APIPromise`.
 *
 * Exposes the cross-cutting facts the parent {@link SdkResource} aggregates:
 * the runtime {@link imports} the method needs and the named response
 * schemas to inline ({@link inlineSchemas}).
 */
export class ApiMethod extends SnippetBase {
  imports: Record<string, string[]>
  /** Named object schemas this method surfaces, to inline as interfaces. */
  inlineSchemas: Record<string, ObjectSchema>
  /** When the method paginates: the `<Resource>Page` alias + its item type. */
  pageAlias: { name: string; itemType: string } | undefined

  #jsDoc: string
  #signature: string
  #body: string

  constructor({ context, generatorKey, operation, methodName, resourceClassName, schemaNames }: ApiMethodArgs) {
    super({ context, generatorKey })

    this.imports = {}
    this.inlineSchemas = {}
    this.pageAlias = undefined

    const httpMethod = operation.method
    const { expression: pathExpression, hasParams } = toClientPath(operation.path)

    const pathParameters = operation.toParams(['path']).map(({ name }) => `${name}: string`)
    const description = 'description' in operation ? operation.description : undefined

    this.#jsDoc = description ? `${toJsDoc(description)}\n` : ''

    // Always-needed runtime imports for a method signature.
    this.#addImport('../internal/request-options', 'RequestOptions')
    if (hasParams) {
      this.#addImport('../internal/utils/path', 'path')
    }

    const successSchema = operation.toSuccessResponse()?.resolve().toSchema()
    const pagination = successSchema ? this.#toPagination(successSchema, resourceClassName, schemaNames) : undefined

    if (pagination) {
      this.pageAlias = { name: pagination.pageName, itemType: pagination.itemType }
      this.#addImport('../core/pagination', 'Page', 'PagePromise')

      const parameterList = ['options?: RequestOptions'].join(', ')
      this.#signature = `${methodName}(${parameterList}): PagePromise<${pagination.pageName}, ${pagination.itemType}>`
      this.#body = `return this._client.getAPIList(${pathExpression}, Page<${pagination.itemType}>, { ...options, __security: { bearerAuth: true } });`
      return
    }

    this.#addImport('../core/api-promise', 'APIPromise')
    const responseType = successSchema ? toTsType(successSchema, schemaNames) : 'void'
    this.#collectInlineSchema(successSchema, schemaNames)

    // Request-body method (create / update): a `body` param after any path
    // params, spread into the call payload.
    const requestBody = operation.toRequestBody(({ schema }) => schema)
    if (requestBody) {
      this.#collectInlineSchema(requestBody, schemaNames)
      const parameterList = [
        ...pathParameters,
        `body: ${toTsType(requestBody, schemaNames)}`,
        'options?: RequestOptions'
      ].join(', ')
      this.#signature = `${methodName}(${parameterList}): APIPromise<${responseType}>`
      this.#body = `return this._client.${httpMethod}(${pathExpression}, { body, ...options, __security: { bearerAuth: true } });`
      return
    }

    const parameterList = [...pathParameters, 'options?: RequestOptions'].join(', ')
    this.#signature = `${methodName}(${parameterList}): APIPromise<${responseType}>`
    this.#body = `return this._client.${httpMethod}(${pathExpression}, { ...options, __security: { bearerAuth: true } });`
  }

  #addImport(module: string, ...names: string[]): void {
    this.imports[module] = [...(this.imports[module] ?? []), ...names]
  }

  /** Record a `$ref`'d object response schema to inline as a named interface. */
  #collectInlineSchema(schema: AnySchema | undefined, schemaNames: Record<string, string>): void {
    if (!schema || schema.type === 'custom' || !schema.isRef()) return

    const refName = toRefName(schema.$ref)
    const resolved = schema.resolve()
    if (resolved.type !== 'object') return

    this.inlineSchemas[schemaNames[refName] ?? refName] = resolved
  }

  /**
   * A list-shaped success response (`{ object: 'list', data: T[] }`) becomes
   * pagination: the item type is `data`'s element, the page alias
   * `<Resource>Page`. The item object is also inlined.
   */
  #toPagination(
    schema: Schema,
    resourceClassName: string,
    schemaNames: Record<string, string>
  ): { pageName: string; itemType: string } | undefined {
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

    this.#collectInlineSchema(data.items, schemaNames)

    return { pageName: `${resourceClassName}Page`, itemType: toTsType(data.items, schemaNames) }
  }

  override toString(): string {
    return `${this.#jsDoc}${this.#signature} {
    ${this.#body}
  }`
  }
}
