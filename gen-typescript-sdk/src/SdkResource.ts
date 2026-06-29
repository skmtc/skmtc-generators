import { SnippetBase } from '@skmtc/core'
import type {
  OasOperationProjectionConstructorArgs,
  OasOperation,
  GenerateContextType,
  GeneratorKey
} from '@skmtc/core'
import {
  TsClass,
  TsHeritage,
  TsMethod,
  createType,
  createNamespace,
  defineAndRegister
} from '@skmtc/lang-typescript'
import { TsProjection } from '@skmtc/gen-typescript-s'
import { SdkResourceBase } from './base.ts'
import { ApiMethod } from './ApiMethod.ts'
import { toClientPath, toPagination } from './resource.ts'
import type { EnrichmentSchema } from './enrichments.ts'

// Stainless's standing note on every generated `<Resource>Page` alias.
const PAGE_ALIAS_NOTE =
  'Note: no pagination actually occurs yet, this is for forwards-compatibility.'

// Stainless's canonical method ordering; anything unlisted sorts after.
const METHOD_ORDER = ['create', 'retrieve', 'update', 'list', 'delete']
const methodPriority = (name: string): number => {
  const index = METHOD_ORDER.indexOf(name)
  return index === -1 ? METHOD_ORDER.length : index
}

/**
 * The `export declare namespace <Resource> { export { type X as X, … } }`
 * re-export — a same-name companion of the class (TS declaration merging;
 * `TsFile` renders it after the primaries). Lists the co-located types in
 * Stainless order (schemas first, then page aliases). Names are read from a
 * thunk so they resolve at render, after every operation has accumulated.
 */
class NamespaceReExport extends SnippetBase {
  #getNames: () => string[]

  constructor(args: {
    context: GenerateContextType
    generatorKey?: GeneratorKey
    getNames: () => string[]
  }) {
    super({ context: args.context, generatorKey: args.generatorKey })
    this.#getNames = args.getNames
  }

  override toString(): string {
    const reExports = this.#getNames()
      .map(name => `type ${name} as ${name}`)
      .join(', ')

    return `{\n  export { ${reExports} };\n}`
  }
}

/**
 * The deferred right-hand side of `export type <Resource>Page = Page<Item>`.
 * Registered before the item schema (so the alias renders directly under the
 * class), but the item's identifier name is only known once that schema is
 * inserted — so it's read from a box populated immediately after.
 */
class PageAliasValue extends SnippetBase {
  #itemType: { name: string }

  constructor(args: {
    context: GenerateContextType
    generatorKey?: GeneratorKey
    itemType: { name: string }
  }) {
    super({ context: args.context, generatorKey: args.generatorKey })
    this.#itemType = args.itemType
  }

  override toString(): string {
    return `Page<${this.#itemType.name}>`
  }
}

/**
 * One resource file, accumulated across every operation carrying the same
 * `resource` enrichment. Its value is a `TsClass` (`export class <Name> extends
 * APIResource { … }`); alongside it the resource registers the co-located
 * schema **types** (composed from `@skmtc/gen-typescript-s`), the
 * `<Resource>Page` alias, and the `declare namespace <Resource>` re-export.
 */
export class SdkResource extends SdkResourceBase {
  description: string | undefined

  #heritage: TsHeritage
  #methods: { method: TsMethod; methodName: string }[] = []
  /** Co-located schema type names, in insertion order (deduped). */
  #schemaNames: string[] = []
  /** Page-alias type names, in insertion order. */
  #pageNames: string[] = []
  #namespaceRegistered = false

  constructor({
    context,
    operation,
    settings
  }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    this.description = settings.enrichments.subject?.resourceDescription

    // The heritage entity renders `extends APIResource ` and registers the
    // `APIResource` value import into this file.
    this.#heritage = new TsHeritage({
      context,
      destinationPath: settings.exportPath,
      generatorKey: this.generatorKey,
      extends: { name: 'APIResource', exportPath: '@/core/resource' }
    })

    const fileHeader = settings.enrichments.generator?.fileHeader
    if (fileHeader) {
      this.register({ custom: fileHeader })
    }
  }

  append(operation: OasOperation, methodName: string, paginated: boolean | undefined): void {
    const className = this.settings.identifier.name
    this.#ensureNamespace(className)

    const { expression: pathExpression, hasParams } = toClientPath(operation.path)
    const pathParameters = operation.toParams(['path']).map(({ name }) => `${name}: string`)

    const successSchema = operation.toSuccessResponse()?.resolve().toSchema()
    const requestBody = operation.toRequestBody(({ schema }) => schema)
    // Pagination is an SDK-config fact (the `paginated` enrichment), not a
    // response-shape guess — `toPagination` only extracts the item schema once
    // we KNOW the method paginates. A `{ object: 'list', data: [] }` response is
    // not enough (e.g. `embeddings.create` has it but is a plain `post`).
    const pagination = paginated && successSchema ? toPagination(successSchema) : undefined

    let responseType = 'void'
    let bodyType: string | undefined
    let paginationInfo: { pageName: string; itemType: string } | undefined

    if (pagination) {
      // Register the `<Resource>Page` alias BEFORE inserting the item schema so
      // it renders directly under the class (Stainless body order). The item's
      // identifier name isn't known yet, so the alias reads it from a box we
      // populate immediately after the insert.
      const pageName = `${className}Page`
      const itemTypeBox = { name: '' }
      this.#ensurePageAlias(pageName, itemTypeBox)

      const itemType = this.#trackSchema(
        this.insertNormalizedModel(TsProjection, {
          schema: pagination.itemSchema,
          fallbackName: `${className}Item`
        }).identifier.name
      )
      itemTypeBox.name = itemType
      paginationInfo = { pageName, itemType }
    } else {
      if (successSchema) {
        responseType = this.#trackSchema(
          this.insertNormalizedModel(TsProjection, {
            schema: successSchema,
            fallbackName: `${className}Response`
          }).identifier.name
        )
      }
      if (requestBody) {
        bodyType = this.#trackSchema(
          this.insertNormalizedModel(TsProjection, {
            schema: requestBody,
            fallbackName: `${className}Params`
          }).identifier.name
        )
      }
    }

    const apiMethod = new ApiMethod({
      context: this.context,
      destinationPath: this.settings.exportPath,
      generatorKey: this.generatorKey,
      methodName,
      httpMethod: operation.method,
      pathExpression,
      hasParams,
      pathParameters,
      description: operation.description,
      responseType,
      bodyType,
      pagination: paginationInfo
    })

    this.#methods.push({
      method: new TsMethod({
        name: methodName,
        parameters: apiMethod.parameters,
        returnType: apiMethod.returnType,
        body: apiMethod.body,
        description: apiMethod.description
      }),
      methodName
    })
  }

  /**
   * Register the `declare namespace` re-export once — a same-name companion of
   * the class. `TsFile` renders companions after the primaries, so it lands last
   * regardless of when it is registered.
   */
  #ensureNamespace(className: string): void {
    if (this.#namespaceRegistered) return
    this.#namespaceRegistered = true

    defineAndRegister(this.context, {
      identifier: createNamespace(className),
      value: new NamespaceReExport({
        context: this.context,
        generatorKey: this.generatorKey,
        getNames: () => this.#reExportNames()
      }),
      destinationPath: this.settings.exportPath
    })
  }

  /** Schema names then page-alias names — the namespace re-export order. */
  #reExportNames(): string[] {
    return [...this.#schemaNames, ...this.#pageNames]
  }

  /** Record a co-located schema name in first-seen order; returns it. */
  #trackSchema(name: string): string {
    if (!this.#schemaNames.includes(name)) this.#schemaNames.push(name)
    return name
  }

  /** The `export type <Resource>Page = Page<Item>` alias, once per resource. */
  #ensurePageAlias(pageName: string, itemType: { name: string }): void {
    if (this.#pageNames.includes(pageName)) return
    this.#pageNames.push(pageName)

    defineAndRegister(this.context, {
      identifier: createType(pageName),
      value: new PageAliasValue({
        context: this.context,
        generatorKey: this.generatorKey,
        itemType
      }),
      leadingComment: PAGE_ALIAS_NOTE,
      destinationPath: this.settings.exportPath
    })
    this.register({ imports: { '@/core/pagination': ['Page'] } })
  }

  override toString(): string {
    // Build the class value at render: heritage + the methods in Stainless
    // order. Pure — `TsClass` registers nothing (heritage/method imports were
    // registered during construction).
    const tsClass = new TsClass({ heritage: this.#heritage })
    for (const { method } of [...this.#methods].sort(
      (a, b) => methodPriority(a.methodName) - methodPriority(b.methodName)
    )) {
      tsClass.addMethod(method)
    }

    return tsClass.toString()
  }
}
