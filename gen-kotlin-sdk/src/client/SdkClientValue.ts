import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent, kdoc } from '@/format.ts'
import {
  serviceOf,
  toClientName,
  type Flavor,
  type SdkClientModel
} from '@/client/SdkClient.ts'

type SdkClientValueArgs = {
  context: GenerateContextType
  model: SdkClientModel
  flavor: Flavor
  basePackage: string
  destinationPath: string
  fileHeader: string
}

/**
 * The client INTERFACE file value (§E-5). Self-contained: it renders the
 * accessor matrix (+ the raw-response view) from its own model and carries
 * the big client KDoc as the `KtDocumented` `description`.
 */
export class SdkClientValue extends KtSnippet {
  model: SdkClientModel
  flavor: Flavor
  description: string

  constructor({ context, model, flavor, basePackage, destinationPath, fileHeader }: SdkClientValueArgs) {
    super({ context })

    this.model = model
    this.flavor = flavor
    this.description = this.#descriptionLines().join('\n')

    const imports: Record<string, string[]> = {
      [`${basePackage}.core`]: ['ClientOptions'],
      [`${basePackage}.services.${flavor === 'async' ? 'async' : 'blocking'}`]: model.resources
        .map(resource => serviceOf(resource, flavor))
        .sort()
    }

    this.register({ imports, fileHeader, destinationPath })
  }

  #descriptionLines(): string[] {
    const mode = this.flavor === 'async' ? 'asynchronously' : 'synchronously'
    const other = this.flavor === 'async' ? 'synchronous' : 'asynchronous'
    const switchMethod = this.flavor === 'async' ? 'sync' : 'async'

    return [
      `A client for interacting with the ${this.model.displayName} REST API ${mode}. You can also switch to ${other} execution via the [${switchMethod}] method.`,
      '',
      'This client performs best when you create a single instance and reuse it for all interactions with the REST API. This is because each client holds its own connection pool and thread pools. Reusing connections and threads reduces latency and saves memory. The client also handles rate limiting per client. This means that creating and using multiple instances at the same time will not respect rate limits.',
      '',
      'The threads and connections that are held will be released automatically if they remain idle. But if you are writing an application that needs to aggressively release unused resources, then you may call [close].'
    ]
  }

  override toString(): string {
    const clientName = toClientName(this.model, this.flavor)
    const otherName = toClientName(this.model, this.flavor === 'async' ? 'blocking' : 'async')
    const switchMethod = this.flavor === 'async' ? 'sync' : 'async'
    const otherMode = this.flavor === 'async' ? 'synchronous' : 'asynchronous'

    const sections = [
      kdoc([
        `Returns a version of this client that uses ${otherMode} execution.`,
        '',
        'The returned client shares its resources, like its connection pool and thread pools, with this client.'
      ]) + `\nfun ${switchMethod}(): ${otherName}`,
      kdoc([
        'Returns a view of this service that provides access to raw HTTP responses for each method.'
      ]) + '\nfun withRawResponse(): WithRawResponse',
      kdoc([
        'Returns a view of this service with the given option modifications applied.',
        '',
        'The original service is not modified.'
      ]) + `\nfun withOptions(modifier: (ClientOptions.Builder) -> Unit): ${clientName}`,
      ...this.model.resources.map(
        resource => `fun ${resource.accessorName}(): ${serviceOf(resource, this.flavor)}`
      ),
      kdoc([
        'Closes this client, relinquishing any underlying resources.',
        '',
        'This is purposefully not inherited from [AutoCloseable] because the client is long-lived and usually should not be synchronously closed via try-with-resources.',
        '',
        "It's also usually not necessary to call this method at all. the default HTTP client automatically releases threads and connections if they remain idle, but if you are writing an application that needs to aggressively release unused resources, then you may call this method."
      ]) + '\nfun close()',
      this.#rawView()
    ]

    return `\n${sections.join('\n\n')}`
  }

  #rawView(): string {
    const clientName = toClientName(this.model, this.flavor)

    const members = [
      kdoc([
        'Returns a view of this service with the given option modifications applied.',
        '',
        'The original service is not modified.'
      ]) +
        `\nfun withOptions(modifier: (ClientOptions.Builder) -> Unit): ${clientName}.WithRawResponse`,
      ...this.model.resources.map(
        resource => `fun ${resource.accessorName}(): ${serviceOf(resource, this.flavor)}.WithRawResponse`
      )
    ]

    return (
      kdoc([
        `A view of [${clientName}] that provides access to raw HTTP responses for each method.`
      ]) + `\ninterface WithRawResponse {\n\n${indent(members.join('\n\n'), 1)}\n}`
    )
  }
}
