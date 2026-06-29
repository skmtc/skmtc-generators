import { KtSnippet } from '@skmtc/lang-kotlin'
import { type ServiceFlavor } from '@/base.ts'
import { indent } from '@/format.ts'
import {
  addModelImports,
  toServiceImplName,
  toServiceName,
  type SdkServiceOperation,
  type ServiceValueArgs
} from '@/services/serviceFacts.ts'

const fn = (flavor: ServiceFlavor) => (flavor === 'async' ? 'suspend fun' : 'fun')

const callSuffix = (flavor: ServiceFlavor) => (flavor === 'async' ? 'Async' : '')

/**
 * The ServiceImpl file value (§E-3) — `internal constructor` + supertype, and
 * an accumulator like {@link import('./SdkServiceValue.ts').SdkServiceValue}.
 * The value is `defineAndRegister`'d directly, so the `KtConstructed` /
 * `KtSupertyped` protocol the `class` shell reads are plain fields on it (no
 * projection to mirror onto).
 */
export class SdkServiceImplValue extends KtSnippet {
  flavor: ServiceFlavor
  serviceName: string
  implName: string
  operations: SdkServiceOperation[] = []

  constructorModifiers: string
  constructorParameters: string
  supertypes: string[]

  #basePackage: string
  #destinationPath: string

  constructor({ context, stem, flavor, basePackage, destinationPath, fileHeader }: ServiceValueArgs) {
    super({ context })

    this.flavor = flavor
    this.serviceName = toServiceName(stem, flavor)
    this.implName = toServiceImplName(stem, flavor)
    this.#basePackage = basePackage
    this.#destinationPath = destinationPath

    this.constructorModifiers = 'internal'
    this.constructorParameters = '    private val clientOptions: ClientOptions'
    this.supertypes = [this.serviceName]

    const coreNames = ['ClientOptions', 'RequestOptions', `prepare${callSuffix(flavor)}`]

    const httpNames = [
      'HttpMethod',
      'HttpRequest',
      'HttpResponse',
      'HttpResponse.Handler',
      'HttpResponseFor',
      'parseable'
    ]

    this.register({
      imports: {
        [`${basePackage}.core`]: coreNames.sort(),
        [`${basePackage}.core.handlers`]: ['errorBodyHandler', 'errorHandler', 'jsonHandler'],
        [`${basePackage}.core.http`]: httpNames
      },
      fileHeader,
      destinationPath
    })
  }

  /** Append one operation and register its per-op imports (model classes,
   * plus `checkRequired` / `json` when the operation needs them). */
  add(operation: SdkServiceOperation): void {
    this.operations.push(operation)

    const imports: Record<string, string[]> = {}

    if (operation.pathParam) {
      imports[`${this.#basePackage}.core`] = ['checkRequired']
    }

    if (operation.bodyKind) {
      imports[`${this.#basePackage}.core.http`] = ['json']
    }

    addModelImports([operation], this.#basePackage, imports)

    this.register({ imports, destinationPath: this.#destinationPath })
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
