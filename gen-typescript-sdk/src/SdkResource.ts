import type { OasOperationProjectionConstructorArgs, OasOperation } from '@skmtc/core'
import { SdkResourceBase } from './base.ts'
import { ApiMethod } from './ApiMethod.ts'
import { collectNamedTypes, toTypeDeclaration, type NamedType } from './toTsType.ts'
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
  /**
   * The resource-level JSDoc rendered above `export class …`. Public so
   * `tsLang.toDefinition` reads it off the value (the Driver passes no
   * description); see lang-typescript's `toValueDescription`.
   */
  description: string | undefined

  #methods: { apiMethod: ApiMethod; methodName: string }[] = []
  #pageAliases: { name: string; itemType: string }[] = []
  #schemaNames: Record<string, string>

  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    this.#schemaNames = settings.enrichments.generator?.schemaNames ?? {}
    this.description = settings.enrichments.subject?.resourceDescription

    // Every resource class extends APIResource.
    this.register({ imports: { '../core/resource': ['APIResource'] } })

    // Codegen banner at the top of the file, when configured.
    const fileHeader = settings.enrichments.generator?.fileHeader
    if (fileHeader) {
      this.register({ banner: fileHeader })
    }
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

    if (apiMethod.pageAlias && !this.#pageAliases.some(page => page.name === apiMethod.pageAlias?.name)) {
      this.#pageAliases.push(apiMethod.pageAlias)
    }
  }

  override toString(): string {
    const sortedMethods = [...this.#methods].sort(
      (a, b) => methodPriority(a.methodName) - methodPriority(b.methodName)
    )

    const methods = sortedMethods.map(({ apiMethod }) => apiMethod.toString()).join('\n\n')

    // Collect every named type reachable from the methods' roots, in method
    // order, deduped.
    const namedTypes = new Map<string, NamedType>()
    for (const { apiMethod } of sortedMethods) {
      for (const root of apiMethod.typeRoots) {
        collectNamedTypes(root, this.#schemaNames, namedTypes)
      }
    }

    const pageDeclarations = this.#pageAliases.map(
      page =>
        `// Note: no pagination actually occurs yet, this is for forwards-compatibility.\nexport type ${page.name} = Page<${page.itemType}>;`
    )

    const typeDeclarations = [...namedTypes.values()].map(named => toTypeDeclaration(named, this.#schemaNames))

    const reExports = [...namedTypes.keys(), ...this.#pageAliases.map(page => page.name)].map(
      name => `type ${name} as ${name}`
    )
    const namespaceDeclaration =
      reExports.length > 0
        ? `export declare namespace ${this.settings.identifier.name} {\n  export { ${reExports.join(', ')} };\n}`
        : undefined

    return [`extends APIResource {\n${methods}\n}`, ...pageDeclarations, ...typeDeclarations, namespaceDeclaration]
      .filter(Boolean)
      .join('\n\n')
  }
}
