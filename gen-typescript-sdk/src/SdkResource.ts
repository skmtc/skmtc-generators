import type { OasOperationProjectionConstructorArgs, OasOperation } from '@skmtc/core'
import { SdkResourceBase } from './base.ts'
import { ApiMethod } from './ApiMethod.ts'
import { toInterfaceBody, schemaDescription, type ObjectSchema } from './toTsType.ts'
import { toJsDoc } from './toJsDoc.ts'
import type { EnrichmentSchema } from './enrichments.ts'

// Stainless's canonical method ordering; anything unlisted sorts after, in
// append order.
const METHOD_ORDER = ['create', 'retrieve', 'update', 'list', 'delete']
const methodPriority = (name: string): number => {
  const index = METHOD_ORDER.indexOf(name)
  return index === -1 ? METHOD_ORDER.length : index
}

/**
 * One resource file, accumulated across every operation that carries the
 * same `resource` enrichment (the `ExpressApp` idiom). Rendered as a
 * `kind: 'class'` definition, so the value below is everything after
 * `export class <Name> ` — the `extends APIResource { … }` heritage and
 * body, then the page-alias / interface / `declare namespace` companions.
 */
export class SdkResource extends SdkResourceBase {
  #methods: { apiMethod: ApiMethod; methodName: string }[] = []
  #inlineSchemas: Record<string, ObjectSchema> = {}
  #pageAliases: { name: string; itemType: string }[] = []
  #schemaNames: Record<string, string>

  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    this.#schemaNames = settings.enrichments.generator?.schemaNames ?? {}

    // Every resource class extends APIResource.
    this.register({ imports: { '../core/resource': ['APIResource'] } })
  }

  /** Add one operation's method to this resource. */
  append(operation: OasOperation, methodName: string): void {
    const apiMethod = new ApiMethod({
      context: this.context,
      generatorKey: this.generatorKey,
      operation,
      methodName,
      resourceClassName: this.settings.identifier.name,
      schemaNames: this.#schemaNames
    })

    this.#methods.push({ apiMethod, methodName })
    this.register({ imports: apiMethod.imports })

    for (const [name, schema] of Object.entries(apiMethod.inlineSchemas)) {
      this.#inlineSchemas[name] ??= schema
    }
    if (apiMethod.pageAlias && !this.#pageAliases.some(page => page.name === apiMethod.pageAlias?.name)) {
      this.#pageAliases.push(apiMethod.pageAlias)
    }
  }

  override toString(): string {
    const methods = [...this.#methods]
      .sort((a, b) => methodPriority(a.methodName) - methodPriority(b.methodName))
      .map(({ apiMethod }) => apiMethod.toString())
      .join('\n\n')

    const pageDeclarations = this.#pageAliases.map(
      page =>
        `// Note: no pagination actually occurs yet, this is for forwards-compatibility.\nexport type ${page.name} = Page<${page.itemType}>;`
    )

    const interfaceDeclarations = Object.entries(this.#inlineSchemas).map(([name, schema]) => {
      const description = schemaDescription(schema)
      const jsDoc = description ? `${toJsDoc(description)}\n` : ''

      return `${jsDoc}export interface ${name} ${toInterfaceBody(schema, this.#schemaNames)}`
    })

    const reExports = [...Object.keys(this.#inlineSchemas), ...this.#pageAliases.map(page => page.name)].map(
      name => `type ${name} as ${name}`
    )
    const namespaceDeclaration =
      reExports.length > 0
        ? `export declare namespace ${this.settings.identifier.name} {\n  export { ${reExports.join(', ')} };\n}`
        : undefined

    return [`extends APIResource {\n${methods}\n}`, ...pageDeclarations, ...interfaceDeclarations, namespaceDeclaration]
      .filter(Boolean)
      .join('\n\n')
  }
}
