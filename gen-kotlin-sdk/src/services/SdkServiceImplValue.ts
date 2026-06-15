import type { GenerateContextType, OasOperation } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import invariant from 'tiny-invariant'
import { resolveEnrichment, toClassStem, type ServiceFlavor } from '@/base.ts'
import { toSdkConfig } from '@/config.ts'
import { indent } from '@/format.ts'
import {
  addModelImports,
  toServiceImplName,
  toServiceName,
  toServiceOperations,
  type SdkServiceOperation
} from '@/services/toServiceOperations.ts'

type SdkServiceImplValueArgs = {
  context: GenerateContextType
  operation: OasOperation
  destinationPath: string
  flavor: ServiceFlavor
}

const fn = (flavor: ServiceFlavor) => (flavor === 'async' ? 'suspend fun' : 'fun')

const callSuffix = (flavor: ServiceFlavor) => (flavor === 'async' ? 'Async' : '')

/**
 * The ServiceImpl file value (§E-3) — `internal constructor` + supertype.
 * Self-contained: computes its own resource operations and renders the
 * delegation class + raw-response impl from its own fields. The
 * `KtConstructed`/`KtSupertyped` protocol the `class` shell reads are plain
 * fields here (note-33), mirrored onto the projection.
 */
export class SdkServiceImplValue extends KtSnippet {
  flavor: ServiceFlavor
  serviceName: string
  implName: string
  operations: SdkServiceOperation[]

  constructorModifiers: string
  constructorParameters: string
  supertypes: string[]

  constructor({ context, operation, destinationPath, flavor }: SdkServiceImplValueArgs) {
    super({ context })

    const config = toSdkConfig(context)
    const enrichment = resolveEnrichment(context)(operation)

    invariant(enrichment, '@skmtc/gen-kotlin-sdk: service projection requires an enrichment')

    const stem = toClassStem(enrichment)

    this.flavor = flavor
    this.serviceName = toServiceName(stem, flavor)
    this.implName = toServiceImplName(stem, flavor)
    this.operations = toServiceOperations({
      context,
      config,
      stem,
      resource: enrichment.resource,
      resolveEnrichment: resolveEnrichment(context)
    })

    this.constructorModifiers = 'internal'
    this.constructorParameters = '    private val clientOptions: ClientOptions'
    this.supertypes = [this.serviceName]

    const coreNames = ['ClientOptions', 'RequestOptions', `prepare${callSuffix(flavor)}`]

    if (this.operations.some(operation => operation.pathParam)) {
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

    if (this.operations.some(operation => operation.bodyKind)) {
      httpNames.push('json')
    }

    const imports: Record<string, string[]> = {
      [`${config.basePackage}.core`]: coreNames.sort(),
      [`${config.basePackage}.core.handlers`]: ['errorBodyHandler', 'errorHandler', 'jsonHandler'],
      [`${config.basePackage}.core.http`]: httpNames
    }

    addModelImports(this.operations, config.basePackage, imports)

    this.register({ imports, fileHeader: config.fileHeader, destinationPath })
  }

  override toString(): string {
    const sections = [
      `private val withRawResponse: ${this.serviceName}.WithRawResponse by lazy {\n` +
        '    WithRawResponseImpl(clientOptions)\n' +
        '}',
      `override fun withRawResponse(): ${this.serviceName}.WithRawResponse = withRawResponse`,
      `override fun withOptions(modifier: (ClientOptions.Builder) -> Unit): ${this.serviceName} =\n` +
        `    ${this.implName}(clientOptions.toBuilder().apply(modifier).build())`,
      ...this.operations.map(operation => this.#delegation(operation)),
      this.#rawImpl()
    ]

    return `\n${sections.join('\n\n')}`
  }

  #delegation(operation: SdkServiceOperation): string {
    const { methodName, paramsClassName, responseClassName } = operation

    return (
      `override ${fn(this.flavor)} ${methodName}(\n` +
      indent([`params: ${paramsClassName},`, 'requestOptions: RequestOptions,'].join('\n'), 1) +
      `\n): ${responseClassName} =\n` +
      `    // ${operation.httpVerb.toLowerCase()} ${operation.path}\n` +
      `    withRawResponse().${methodName}(params, requestOptions).parse()`
    )
  }

  #rawImpl(): string {
    const members = [
      'private val errorHandler: Handler<HttpResponse> =\n' +
        '    errorHandler(errorBodyHandler(clientOptions.jsonMapper))',
      'override fun withOptions(\n' +
        '    modifier: (ClientOptions.Builder) -> Unit\n' +
        `): ${this.serviceName}.WithRawResponse =\n` +
        `    ${this.implName}.WithRawResponseImpl(clientOptions.toBuilder().apply(modifier).build())`,
      ...this.operations.flatMap(operation => this.#rawMethod(operation))
    ]

    return (
      `class WithRawResponseImpl internal constructor(private val clientOptions: ClientOptions) :\n` +
      `    ${this.serviceName}.WithRawResponse {\n\n` +
      `${indent(members.join('\n\n'), 1)}\n}`
    )
  }

  #rawMethod(operation: SdkServiceOperation): string[] {
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
      `override ${fn(this.flavor)} ${methodName}(\n` +
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
      `            .prepare${callSuffix(this.flavor)}(clientOptions, params)\n` +
      '    val requestOptions = requestOptions.applyDefaults(RequestOptions.from(clientOptions))\n' +
      `    val response = clientOptions.httpClient.execute${callSuffix(this.flavor)}(request, requestOptions)\n` +
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
}
