import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent } from '@/format.ts'
import {
  flavorDir,
  serviceOf,
  toClientName,
  type Flavor,
  type SdkClientModel
} from '@/client/SdkClient.ts'

type SdkClientImplValueArgs = {
  context: GenerateContextType
  model: SdkClientModel
  flavor: Flavor
  basePackage: string
  destinationPath: string
  fileHeader: string
}

/**
 * The client IMPL file value (§E-5) — public primary constructor + supertype.
 * Self-contained: it renders the lazy-accessor matrix + raw-response impl from
 * its own model. The `KtConstructed` / `KtSupertyped` protocol the `class`
 * shell reads are plain fields (the value is `defineAndRegister`'d directly, so
 * there is no projection to mirror onto).
 */
export class SdkClientImplValue extends KtSnippet {
  model: SdkClientModel
  flavor: Flavor

  constructorParameters: string
  supertypes: string[]

  constructor({ context, model, flavor, basePackage, destinationPath, fileHeader }: SdkClientImplValueArgs) {
    super({ context })

    this.model = model
    this.flavor = flavor

    this.constructorParameters = '    private val clientOptions: ClientOptions'
    this.supertypes = [toClientName(model, flavor)]

    const imports: Record<string, string[]> = {
      [`${basePackage}.core`]: ['ClientOptions', 'getPackageVersion'],
      [`${basePackage}.services.${flavorDir(flavor)}`]: model.resources
        .flatMap(resource => [serviceOf(resource, flavor), `${serviceOf(resource, flavor)}Impl`])
        .sort()
    }

    this.register({ imports, fileHeader, destinationPath })
  }

  override toString(): string {
    const clientName = toClientName(this.model, this.flavor)
    const implName = `${clientName}Impl`
    const otherName = toClientName(this.model, this.flavor === 'async' ? 'blocking' : 'async')
    const switchMethod = this.flavor === 'async' ? 'sync' : 'async'

    const sections = [
      'private val clientOptionsWithUserAgent =\n' +
        '    if (clientOptions.headers.names().contains("User-Agent")) clientOptions\n' +
        '    else\n' +
        '        clientOptions\n' +
        '            .toBuilder()\n' +
        '            .putHeader("User-Agent", "${javaClass.simpleName}/Kotlin ${getPackageVersion()}")\n' +
        '            .build()',
      `// Pass the original clientOptions so that this client sets its own User-Agent.\n` +
        `private val ${switchMethod}: ${otherName} by lazy { ${otherName}Impl(clientOptions) }`,
      `private val withRawResponse: ${clientName}.WithRawResponse by lazy {\n` +
        '    WithRawResponseImpl(clientOptions)\n' +
        '}',
      ...this.model.resources.map(
        resource =>
          `private val ${resource.accessorName}: ${serviceOf(resource, this.flavor)} by lazy {\n` +
          `    ${serviceOf(resource, this.flavor)}Impl(clientOptionsWithUserAgent)\n` +
          '}'
      ),
      `override fun ${switchMethod}(): ${otherName} = ${switchMethod}`,
      `override fun withRawResponse(): ${clientName}.WithRawResponse = withRawResponse`,
      `override fun withOptions(modifier: (ClientOptions.Builder) -> Unit): ${clientName} =\n` +
        `    ${implName}(clientOptions.toBuilder().apply(modifier).build())`,
      ...this.model.resources.map(
        resource =>
          `override fun ${resource.accessorName}(): ${serviceOf(resource, this.flavor)} = ${resource.accessorName}`
      ),
      'override fun close() = clientOptions.close()',
      this.#rawImpl()
    ]

    return `\n${sections.join('\n\n')}`
  }

  #rawImpl(): string {
    const clientName = toClientName(this.model, this.flavor)
    const implName = `${clientName}Impl`

    const members = [
      ...this.model.resources.map(
        resource =>
          `private val ${resource.accessorName}: ${serviceOf(resource, this.flavor)}.WithRawResponse by lazy {\n` +
          `    ${serviceOf(resource, this.flavor)}Impl.WithRawResponseImpl(clientOptions)\n` +
          '}'
      ),
      'override fun withOptions(\n' +
        '    modifier: (ClientOptions.Builder) -> Unit\n' +
        `): ${clientName}.WithRawResponse =\n` +
        `    ${implName}.WithRawResponseImpl(clientOptions.toBuilder().apply(modifier).build())`,
      ...this.model.resources.map(
        resource =>
          `override fun ${resource.accessorName}(): ${serviceOf(resource, this.flavor)}.WithRawResponse = ${resource.accessorName}`
      )
    ]

    return (
      `class WithRawResponseImpl internal constructor(private val clientOptions: ClientOptions) :\n` +
      `    ${clientName}.WithRawResponse {\n\n` +
      `${indent(members.join('\n\n'), 1)}\n}`
    )
  }
}
