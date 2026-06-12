import { indent, kdoc } from '@/format.ts'
import { addModelImports, toServiceName, type ServiceFlavor } from '@/services/renderService.ts'
import type { SdkService, SdkServiceOperation } from '@/services/SdkService.ts'

export const toServiceImplName = (service: SdkService, flavor: ServiceFlavor): string =>
  `${toServiceName(service, flavor)}Impl`

const fn = (flavor: ServiceFlavor) => (flavor === 'async' ? 'suspend fun' : 'fun')

const callSuffix = (flavor: ServiceFlavor) => (flavor === 'async' ? 'Async' : '')

/** The ServiceImpl class body (§E-3). */
export const renderServiceImplBody = (service: SdkService, flavor: ServiceFlavor): string => {
  const serviceName = toServiceName(service, flavor)
  const implName = toServiceImplName(service, flavor)

  const sections = [
    `private val withRawResponse: ${serviceName}.WithRawResponse by lazy {\n` +
      '    WithRawResponseImpl(clientOptions)\n' +
      '}',
    `override fun withRawResponse(): ${serviceName}.WithRawResponse = withRawResponse`,
    `override fun withOptions(modifier: (ClientOptions.Builder) -> Unit): ${serviceName} =\n` +
      `    ${implName}(clientOptions.toBuilder().apply(modifier).build())`,
    ...service.operations.map(operation => renderDelegation(operation, flavor)),
    renderRawImpl(service, flavor)
  ]

  return `\n${sections.join('\n\n')}`
}

const renderDelegation = (operation: SdkServiceOperation, flavor: ServiceFlavor): string => {
  const { methodName, paramsClassName, responseClassName } = operation

  return (
    `override ${fn(flavor)} ${methodName}(\n` +
    indent([`params: ${paramsClassName},`, 'requestOptions: RequestOptions,'].join('\n'), 1) +
    `\n): ${responseClassName} =\n` +
    `    // ${operation.httpVerb.toLowerCase()} ${operation.path}\n` +
    `    withRawResponse().${methodName}(params, requestOptions).parse()`
  )
}

const renderRawImpl = (service: SdkService, flavor: ServiceFlavor): string => {
  const serviceName = toServiceName(service, flavor)
  const implName = toServiceImplName(service, flavor)

  const members = [
    'private val errorHandler: Handler<HttpResponse> =\n' +
      '    errorHandler(errorBodyHandler(clientOptions.jsonMapper))',
    'override fun withOptions(\n' +
      '    modifier: (ClientOptions.Builder) -> Unit\n' +
      `): ${serviceName}.WithRawResponse =\n` +
      `    ${implName}.WithRawResponseImpl(clientOptions.toBuilder().apply(modifier).build())`,
    ...service.operations.flatMap(operation => renderRawMethod(operation, flavor))
  ]

  return (
    `class WithRawResponseImpl internal constructor(private val clientOptions: ClientOptions) :\n` +
    `    ${serviceName}.WithRawResponse {\n\n` +
    `${indent(members.join('\n\n'), 1)}\n}`
  )
}

const renderRawMethod = (operation: SdkServiceOperation, flavor: ServiceFlavor): string[] => {
  const { methodName, paramsClassName, responseClassName, pathParam } = operation

  const handler =
    `private val ${methodName}Handler: Handler<${responseClassName}> =\n` +
    `    jsonHandler<${responseClassName}>(clientOptions.jsonMapper)`

  const segments = operation.pathSegments
    .map(segment =>
      segment.kind === 'literal'
        ? `"${segment.value}"`
        : `"\${params._pathParam(${segment.index})}${segment.suffix}"`
    )
    .join(', ')

  const checkBlock = pathParam
    ? '    // We check here instead of in the params builder because this can be specified\n' +
      '    // positionally or in the params class.\n' +
      `    checkRequired("${pathParam.kotlinName}", params.${pathParam.kotlinName}())\n`
    : ''

  const bodyLine =
    operation.bodyKind === 'required'
      ? '            .body(json(clientOptions.jsonMapper, params._body()))\n'
      : operation.bodyKind === 'optional'
        ? '            .apply { params._body()?.let { body(json(clientOptions.jsonMapper, it)) } }\n'
        : ''

  const method =
    `override ${fn(flavor)} ${methodName}(\n` +
    indent([`params: ${paramsClassName},`, 'requestOptions: RequestOptions,'].join('\n'), 1) +
    `\n): HttpResponseFor<${responseClassName}> {\n` +
    checkBlock +
    '    val request =\n' +
    '        HttpRequest.builder()\n' +
    `            .method(HttpMethod.${operation.httpVerb})\n` +
    '            .baseUrl(clientOptions.baseUrl())\n' +
    `            .addPathSegments(${segments})\n` +
    bodyLine +
    '            .build()\n' +
    `            .prepare${callSuffix(flavor)}(clientOptions, params)\n` +
    '    val requestOptions = requestOptions.applyDefaults(RequestOptions.from(clientOptions))\n' +
    `    val response = clientOptions.httpClient.execute${callSuffix(flavor)}(request, requestOptions)\n` +
    '    return errorHandler.handle(response).parseable {\n' +
    '        response\n' +
    `            .use { ${methodName}Handler.handle(it) }\n` +
    '            .also {\n' +
    '                if (requestOptions.responseValidation!!) {\n' +
    '                    it.validate()\n' +
    '                }\n' +
    '            }\n' +
    '    }\n' +
    '}'

  return [handler, method]
}

/** Imports for a ServiceImpl file. */
export const toServiceImplImports = (
  service: SdkService,
  flavor: ServiceFlavor,
  basePackage: string
): Record<string, string[]> => {
  const coreNames = ['ClientOptions', 'RequestOptions', `prepare${callSuffix(flavor)}`]

  if (service.operations.some(operation => operation.pathParam)) {
    coreNames.push('checkRequired')
  }

  const httpNames = [
    'HttpMethod',
    'HttpRequest',
    'HttpResponse',
    'HttpResponse.Handler',
    'HttpResponseFor',
    'parseable'
  ]

  if (service.operations.some(operation => operation.bodyKind)) {
    httpNames.push('json')
  }

  const imports: Record<string, string[]> = {
    [`${basePackage}.core`]: coreNames.sort(),
    [`${basePackage}.core.handlers`]: ['errorBodyHandler', 'errorHandler', 'jsonHandler'],
    [`${basePackage}.core.http`]: httpNames
  }

  addModelImports(service, basePackage, imports)

  return imports
}
