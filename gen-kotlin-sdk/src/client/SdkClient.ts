import { indent, kdoc } from '@/format.ts'

/** One per-resource entry, in CONFIG ORDER (§E-5). */
export type SdkClientResource = {
  /** Accessor name (`agenciesWithCoverage`). */
  accessorName: string
  /** Service class stem (`AgenciesWithCoverage`, `TripDetail`). */
  stem: string
}

export type SdkClientModel = {
  prefix: string
  displayName: string
  resources: SdkClientResource[]
}

type Flavor = 'blocking' | 'async'

const suffix = (flavor: Flavor) => (flavor === 'async' ? 'Async' : '')

export const toClientName = (model: SdkClientModel, flavor: Flavor): string =>
  `${model.prefix}Client${suffix(flavor)}`

const serviceOf = (resource: SdkClientResource, flavor: Flavor): string =>
  `${resource.stem}Service${suffix(flavor)}`

export const clientKdocLines = (model: SdkClientModel, flavor: Flavor): string[] => {
  const mode = flavor === 'async' ? 'asynchronously' : 'synchronously'
  const other = flavor === 'async' ? 'synchronous' : 'asynchronous'
  const switchMethod = flavor === 'async' ? 'sync' : 'async'

  return [
    `A client for interacting with the ${model.displayName} REST API ${mode}. You can also switch to ${other} execution via the [${switchMethod}] method.`,
    '',
    'This client performs best when you create a single instance and reuse it for all interactions with the REST API. This is because each client holds its own connection pool and thread pools. Reusing connections and threads reduces latency and saves memory. The client also handles rate limiting per client. This means that creating and using multiple instances at the same time will not respect rate limits.',
    '',
    'The threads and connections that are held will be released automatically if they remain idle. But if you are writing an application that needs to aggressively release unused resources, then you may call [close].'
  ]
}

/** The client interface body. */
export const renderClientBody = (model: SdkClientModel, flavor: Flavor): string => {
  const clientName = toClientName(model, flavor)
  const otherName = toClientName(model, flavor === 'async' ? 'blocking' : 'async')
  const switchMethod = flavor === 'async' ? 'sync' : 'async'
  const otherMode = flavor === 'async' ? 'synchronous' : 'asynchronous'

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
    ...model.resources.map(
      resource => `fun ${resource.accessorName}(): ${serviceOf(resource, flavor)}`
    ),
    kdoc([
      'Closes this client, relinquishing any underlying resources.',
      '',
      'This is purposefully not inherited from [AutoCloseable] because the client is long-lived and usually should not be synchronously closed via try-with-resources.',
      '',
      "It's also usually not necessary to call this method at all. the default HTTP client automatically releases threads and connections if they remain idle, but if you are writing an application that needs to aggressively release unused resources, then you may call this method."
    ]) + '\nfun close()',
    renderClientRawView(model, flavor)
  ]

  return `\n${sections.join('\n\n')}`
}

const renderClientRawView = (model: SdkClientModel, flavor: Flavor): string => {
  const clientName = toClientName(model, flavor)

  const members = [
    kdoc([
      'Returns a view of this service with the given option modifications applied.',
      '',
      'The original service is not modified.'
    ]) + `\nfun withOptions(modifier: (ClientOptions.Builder) -> Unit): ${clientName}.WithRawResponse`,
    ...model.resources.map(
      resource =>
        `fun ${resource.accessorName}(): ${serviceOf(resource, flavor)}.WithRawResponse`
    )
  ]

  return (
    kdoc([
      `A view of [${clientName}] that provides access to raw HTTP responses for each method.`
    ]) +
    `\ninterface WithRawResponse {\n\n${indent(members.join('\n\n'), 1)}\n}`
  )
}

/** The client impl body. */
export const renderClientImplBody = (model: SdkClientModel, flavor: Flavor): string => {
  const clientName = toClientName(model, flavor)
  const implName = `${clientName}Impl`
  const otherName = toClientName(model, flavor === 'async' ? 'blocking' : 'async')
  const switchMethod = flavor === 'async' ? 'sync' : 'async'

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
    ...model.resources.map(
      resource =>
        `private val ${resource.accessorName}: ${serviceOf(resource, flavor)} by lazy {\n` +
        `    ${serviceOf(resource, flavor)}Impl(clientOptionsWithUserAgent)\n` +
        '}',
    ),
    `override fun ${switchMethod}(): ${otherName} = ${switchMethod}`,
    `override fun withRawResponse(): ${clientName}.WithRawResponse = withRawResponse`,
    `override fun withOptions(modifier: (ClientOptions.Builder) -> Unit): ${clientName} =\n` +
      `    ${implName}(clientOptions.toBuilder().apply(modifier).build())`,
    ...model.resources.map(
      resource =>
        `override fun ${resource.accessorName}(): ${serviceOf(resource, flavor)} = ${resource.accessorName}`
    ),
    'override fun close() = clientOptions.close()',
    renderClientRawImpl(model, flavor)
  ]

  return `\n${sections.join('\n\n')}`
}

const renderClientRawImpl = (model: SdkClientModel, flavor: Flavor): string => {
  const clientName = toClientName(model, flavor)
  const implName = `${clientName}Impl`

  const members = [
    ...model.resources.map(
      resource =>
        `private val ${resource.accessorName}: ${serviceOf(resource, flavor)}.WithRawResponse by lazy {\n` +
        `    ${serviceOf(resource, flavor)}Impl.WithRawResponseImpl(clientOptions)\n` +
        '}',
    ),
    'override fun withOptions(\n' +
      '    modifier: (ClientOptions.Builder) -> Unit\n' +
      `): ${clientName}.WithRawResponse =\n` +
      `    ${implName}.WithRawResponseImpl(clientOptions.toBuilder().apply(modifier).build())`,
    ...model.resources.map(
      resource =>
        `override fun ${resource.accessorName}(): ${serviceOf(resource, flavor)}.WithRawResponse = ${resource.accessorName}`
    )
  ]

  return (
    `class WithRawResponseImpl internal constructor(private val clientOptions: ClientOptions) :\n` +
    `    ${clientName}.WithRawResponse {\n\n` +
    `${indent(members.join('\n\n'), 1)}\n}`
  )
}

const flavorDir = (flavor: Flavor) => (flavor === 'async' ? 'async' : 'blocking')

export const toClientImports = (
  model: SdkClientModel,
  flavor: Flavor,
  basePackage: string
): Record<string, string[]> => {
  return {
    [`${basePackage}.core`]: ['ClientOptions'],
    [`${basePackage}.services.${flavorDir(flavor)}`]: model.resources
      .map(resource => serviceOf(resource, flavor))
      .sort()
  }
}

export const toClientImplImports = (
  model: SdkClientModel,
  flavor: Flavor,
  basePackage: string
): Record<string, string[]> => {
  return {
    [`${basePackage}.core`]: ['ClientOptions', 'getPackageVersion'],
    [`${basePackage}.services.${flavorDir(flavor)}`]: model.resources
      .flatMap(resource => [serviceOf(resource, flavor), `${serviceOf(resource, flavor)}Impl`])
      .sort()
  }
}
