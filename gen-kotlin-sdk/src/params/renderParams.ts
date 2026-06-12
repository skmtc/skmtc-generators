import { decapitalize } from '../model/SdkModel.ts'
import { indent, kdoc, renderEnumClass, type RenderContext } from '../model/renderModel.ts'
import { toParamTypeExpression, type SdkParam, type SdkParams } from './SdkParams.ts'

/** Primitive scalars get the boxed-alias setter overload (§D-3). */
const isPrimitive = (param: SdkParam): boolean => {
  return param.type.kind === 'scalar' && param.type.kotlin !== 'String'
}

const typeOf = (param: SdkParam): string => toParamTypeExpression(param.type)

/** Constructor parameter list (the `KtConstructed` protocol value). */
export const renderParamsConstructorParameters = (model: SdkParams): string => {
  const paramLines = model.params.map(param => {
    const nullable = param.required ? '' : '?'

    return `private val ${param.kotlinName}: ${typeOf(param)}${nullable},`
  })

  return indent(
    [
      ...paramLines,
      'private val additionalHeaders: Headers,',
      'private val additionalQueryParams: QueryParams,'
    ].join('\n'),
    1
  )
}

/** The full class body — §D-3 sections in corpus order. */
export const renderParamsBody = (model: SdkParams, context: RenderContext): string => {
  const required = model.params.filter(param => param.required)

  const sections = [
    ...model.params.map(param => renderAccessor(param)),
    kdoc(['Additional headers to send with the request.']) +
      '\nfun _additionalHeaders(): Headers = additionalHeaders',
    kdoc(['Additional query param to send with the request.']) +
      '\nfun _additionalQueryParams(): QueryParams = additionalQueryParams',
    'fun toBuilder() = Builder().from(this)',
    renderCompanion(model, required),
    renderBuilder(model, required),
    ...(model.params.some(param => param.location === 'path') ? [renderPathParam(model)] : []),
    'override fun _headers(): Headers = additionalHeaders',
    renderQueryParamsOverride(model),
    ...model.params.flatMap(param =>
      param.type.kind === 'enum'
        ? [renderEnumClass(param.type.enumModel, context, { documentedValidate: true })]
        : []
    ),
    renderEquals(model),
    renderHashCode(model),
    renderToString(model)
  ]

  return `\n${sections.join('\n\n')}`
}

const renderAccessor = (param: SdkParam): string => {
  const description = param.description ? `${kdoc([param.description])}\n` : ''
  const nullable = param.required ? '' : '?'

  return `${description}fun ${param.kotlinName}(): ${typeOf(param)}${nullable} = ${param.kotlinName}`
}

const renderCompanion = (model: SdkParams, required: SdkParam[]): string => {
  const fence = required.length
    ? [
        '',
        'The following fields are required:',
        '```kotlin',
        ...required.map(param => `.${param.kotlinName}()`),
        '```'
      ]
    : []

  const members = [
    ...(required.length ? [] : [`fun none(): ${model.className} = builder().build()`]),
    kdoc([
      `Returns a mutable builder for constructing an instance of [${model.className}].`,
      ...fence
    ]) + '\nfun builder() = Builder()'
  ]

  return `companion object {\n\n${indent(members.join('\n\n'), 1)}\n}`
}

const renderBuilder = (model: SdkParams, required: SdkParam[]): string => {
  const fromParameter = decapitalize(model.className)

  const variables = [
    ...model.params.map(param => `private var ${param.kotlinName}: ${typeOf(param)}? = null`),
    'private var additionalHeaders: Headers.Builder = Headers.builder()',
    'private var additionalQueryParams: QueryParams.Builder = QueryParams.builder()'
  ]

  const fromBlock =
    `internal fun from(${fromParameter}: ${model.className}) = apply {\n` +
    indent(
      [
        ...model.params.map(param => `${param.kotlinName} = ${fromParameter}.${param.kotlinName}`),
        `additionalHeaders = ${fromParameter}.additionalHeaders.toBuilder()`,
        `additionalQueryParams = ${fromParameter}.additionalQueryParams.toBuilder()`
      ].join('\n'),
      1
    ) +
    '\n}'

  const setters = model.params.flatMap(param => renderSetters(param))

  const buildArguments = model.params.map(param =>
    param.required
      ? `checkRequired("${param.kotlinName}", ${param.kotlinName}),`
      : `${param.kotlinName},`
  )

  const buildKdoc = kdoc([
    `Returns an immutable instance of [${model.className}].`,
    '',
    'Further updates to this [Builder] will not mutate the returned instance.',
    ...(required.length
      ? [
          '',
          'The following fields are required:',
          '```kotlin',
          ...required.map(param => `.${param.kotlinName}()`),
          '```',
          '',
          '@throws IllegalStateException if any required field is unset.'
        ]
      : [])
  ])

  const buildBlock =
    `${buildKdoc}\n` +
    `fun build(): ${model.className} =\n` +
    `    ${model.className}(\n` +
    indent(
      [...buildArguments, 'additionalHeaders.build(),', 'additionalQueryParams.build(),'].join(
        '\n'
      ),
      2
    ) +
    '\n    )'

  const body = [
    variables.join('\n'),
    fromBlock,
    ...setters,
    additionalsBlock,
    buildBlock
  ].join('\n\n')

  return `${kdoc([`A builder for [${model.className}].`])}\nclass Builder internal constructor() {\n\n${indent(body, 1)}\n}`
}

const renderSetters = (param: SdkParam): string[] => {
  const { kotlinName } = param
  const description = param.description ? `${kdoc([param.description])}\n` : ''
  const typeExpression = typeOf(param)

  if (param.required) {
    return [
      `${description}fun ${kotlinName}(${kotlinName}: ${typeExpression}) = apply { this.${kotlinName} = ${kotlinName} }`
    ]
  }

  const blocks = [
    `${description}fun ${kotlinName}(${kotlinName}: ${typeExpression}?) = apply { this.${kotlinName} = ${kotlinName} }`
  ]

  if (isPrimitive(param)) {
    blocks.push(
      kdoc([
        `Alias for [Builder.${kotlinName}].`,
        '',
        'This unboxed primitive overload exists for backwards compatibility.'
      ]) +
        `\nfun ${kotlinName}(${kotlinName}: ${typeExpression}) = ${kotlinName}(${kotlinName} as ${typeExpression}?)`
    )
  }

  return blocks
}

const renderPathParam = (model: SdkParams): string => {
  const pathParams = model.params.filter(param => param.location === 'path')

  const arms = pathParams.map(
    (param, index) => `${index} -> ${param.kotlinName} ?: ""`
  )

  return (
    'fun _pathParam(index: Int): String =\n' +
    '    when (index) {\n' +
    indent([...arms, 'else -> ""'].join('\n'), 2) +
    '\n    }'
  )
}

const renderQueryParamsOverride = (model: SdkParams): string => {
  const queryParams = model.params.filter(param => param.location === 'query')

  if (!queryParams.length) {
    return 'override fun _queryParams(): QueryParams = additionalQueryParams'
  }

  const puts = queryParams.map(param => {
    const stringify = (expression: string) => {
      if (param.type.kind === 'datetime') {
        // LocalDate serializes via plain toString; only OffsetDateTime
        // goes through the ISO formatter (corpus evidence).
        return param.type.date === 'local-date'
          ? `${expression}.toString()`
          : `DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(${expression})`
      }

      return param.type.kind === 'scalar' && param.type.kotlin === 'String'
        ? expression
        : `${expression}.toString()`
    }

    return param.required
      ? `put("${param.wireName}", ${stringify(param.kotlinName)})`
      : `${param.kotlinName}?.let { put("${param.wireName}", ${stringify('it')}) }`
  })

  return (
    'override fun _queryParams(): QueryParams =\n' +
    '    QueryParams.builder()\n' +
    '        .apply {\n' +
    indent([...puts, 'putAll(additionalQueryParams)'].join('\n'), 3) +
    '\n        }\n' +
    '        .build()'
  )
}

const allNames = (model: SdkParams): string[] => [
  ...model.params.map(param => param.kotlinName),
  'additionalHeaders',
  'additionalQueryParams'
]

const renderEquals = (model: SdkParams): string => {
  const comparisons = allNames(model)
    .map(name => `${name} == other.${name}`)
    .join(' &&\n')

  return (
    'override fun equals(other: Any?): Boolean {\n' +
    '    if (this === other) {\n' +
    '        return true\n' +
    '    }\n' +
    '\n' +
    indent(`return other is ${model.className} &&\n${indent(comparisons, 1)}`, 1) +
    '\n}'
  )
}

const renderHashCode = (model: SdkParams): string => {
  return `override fun hashCode(): Int = Objects.hash(${allNames(model).join(', ')})`
}

const renderToString = (model: SdkParams): string => {
  const parts = allNames(model)
    .map(name => `${name}=$${name}`)
    .join(', ')

  return `override fun toString() =\n    "${model.className}{${parts}}"`
}

/** The fixed additional-headers/query-params Builder block (§D-3). */
const additionalsBlock = [
  'fun additionalHeaders(additionalHeaders: Headers) = apply {\n' +
    '    this.additionalHeaders.clear()\n' +
    '    putAllAdditionalHeaders(additionalHeaders)\n' +
    '}',
  'fun additionalHeaders(additionalHeaders: Map<String, Iterable<String>>) = apply {\n' +
    '    this.additionalHeaders.clear()\n' +
    '    putAllAdditionalHeaders(additionalHeaders)\n' +
    '}',
  'fun putAdditionalHeader(name: String, value: String) = apply {\n' +
    '    additionalHeaders.put(name, value)\n' +
    '}',
  'fun putAdditionalHeaders(name: String, values: Iterable<String>) = apply {\n' +
    '    additionalHeaders.put(name, values)\n' +
    '}',
  'fun putAllAdditionalHeaders(additionalHeaders: Headers) = apply {\n' +
    '    this.additionalHeaders.putAll(additionalHeaders)\n' +
    '}',
  'fun putAllAdditionalHeaders(additionalHeaders: Map<String, Iterable<String>>) = apply {\n' +
    '    this.additionalHeaders.putAll(additionalHeaders)\n' +
    '}',
  'fun replaceAdditionalHeaders(name: String, value: String) = apply {\n' +
    '    additionalHeaders.replace(name, value)\n' +
    '}',
  'fun replaceAdditionalHeaders(name: String, values: Iterable<String>) = apply {\n' +
    '    additionalHeaders.replace(name, values)\n' +
    '}',
  'fun replaceAllAdditionalHeaders(additionalHeaders: Headers) = apply {\n' +
    '    this.additionalHeaders.replaceAll(additionalHeaders)\n' +
    '}',
  'fun replaceAllAdditionalHeaders(additionalHeaders: Map<String, Iterable<String>>) = apply {\n' +
    '    this.additionalHeaders.replaceAll(additionalHeaders)\n' +
    '}',
  'fun removeAdditionalHeaders(name: String) = apply { additionalHeaders.remove(name) }',
  'fun removeAllAdditionalHeaders(names: Set<String>) = apply {\n' +
    '    additionalHeaders.removeAll(names)\n' +
    '}',
  'fun additionalQueryParams(additionalQueryParams: QueryParams) = apply {\n' +
    '    this.additionalQueryParams.clear()\n' +
    '    putAllAdditionalQueryParams(additionalQueryParams)\n' +
    '}',
  'fun additionalQueryParams(additionalQueryParams: Map<String, Iterable<String>>) = apply {\n' +
    '    this.additionalQueryParams.clear()\n' +
    '    putAllAdditionalQueryParams(additionalQueryParams)\n' +
    '}',
  'fun putAdditionalQueryParam(key: String, value: String) = apply {\n' +
    '    additionalQueryParams.put(key, value)\n' +
    '}',
  'fun putAdditionalQueryParams(key: String, values: Iterable<String>) = apply {\n' +
    '    additionalQueryParams.put(key, values)\n' +
    '}',
  'fun putAllAdditionalQueryParams(additionalQueryParams: QueryParams) = apply {\n' +
    '    this.additionalQueryParams.putAll(additionalQueryParams)\n' +
    '}',
  'fun putAllAdditionalQueryParams(additionalQueryParams: Map<String, Iterable<String>>) =\n' +
    '    apply {\n' +
    '        this.additionalQueryParams.putAll(additionalQueryParams)\n' +
    '    }',
  'fun replaceAdditionalQueryParams(key: String, value: String) = apply {\n' +
    '    additionalQueryParams.replace(key, value)\n' +
    '}',
  'fun replaceAdditionalQueryParams(key: String, values: Iterable<String>) = apply {\n' +
    '    additionalQueryParams.replace(key, values)\n' +
    '}',
  'fun replaceAllAdditionalQueryParams(additionalQueryParams: QueryParams) = apply {\n' +
    '    this.additionalQueryParams.replaceAll(additionalQueryParams)\n' +
    '}',
  'fun replaceAllAdditionalQueryParams(additionalQueryParams: Map<String, Iterable<String>>) =\n' +
    '    apply {\n' +
    '        this.additionalQueryParams.replaceAll(additionalQueryParams)\n' +
    '    }',
  'fun removeAdditionalQueryParams(key: String) = apply { additionalQueryParams.remove(key) }',
  'fun removeAllAdditionalQueryParams(keys: Set<String>) = apply {\n' +
    '    additionalQueryParams.removeAll(keys)\n' +
    '}'
].join('\n\n')
