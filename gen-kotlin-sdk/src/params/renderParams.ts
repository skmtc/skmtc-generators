import { capitalize } from '@skmtc/core'
import {
  decapitalize,
  toSingular,
  toTypeExpression,
  type SdkField,
  type SdkModel
} from '../model/SdkModel.ts'
import {
  addMethodKdoc,
  indent,
  kdoc,
  optionalThrows,
  rawJsonSetterKdoc,
  renderEnumClass,
  renderNestedModelClass,
  requiredThrows,
  toAddMethodInfo,
  type RenderContext
} from '../model/renderModel.ts'
import {
  bodyFenceFields,
  bodyHasRequired,
  toParamTypeExpression,
  type SdkBody,
  type SdkParam,
  type SdkParams
} from './SdkParams.ts'

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

  const bodyLine =
    model.body?.kind === 'model'
      ? [`private val body: ${model.body.model.className},`]
      : model.body?.kind === 'ref'
        ? [`private val ${model.body.kotlinName}: ${model.body.className},`]
        : []

  // The map shape carries the additionalBodyProperties axis LAST
  // (corpus: AuthRuleV2DeleteParams).
  const mapLine =
    model.body?.kind === 'map'
      ? ['private val additionalBodyProperties: Map<String, JsonValue>,']
      : []

  return indent(
    [
      ...paramLines,
      ...bodyLine,
      'private val additionalHeaders: Headers,',
      'private val additionalQueryParams: QueryParams,',
      ...mapLine
    ].join('\n'),
    1
  )
}

/** Required entries for the companion/build fences: params, then body fields. */
const fenceNames = (model: SdkParams): string[] => [
  ...model.params.filter(param => param.required).map(param => param.kotlinName),
  ...bodyFenceFields(model.body)
]

/** `none()` availability: no required params AND no construction-required body. */
const modelHasNone = (model: SdkParams): boolean =>
  !model.params.some(param => param.required) && !bodyHasRequired(model.body)

/** The full class body — §D-3 sections in corpus order (+ the F3 body sections). */
export const renderParamsBody = (model: SdkParams, context: RenderContext): string => {
  const sections = [
    ...model.params.map(param => renderAccessor(param)),
    ...(model.body ? renderBodyAccessors(model.body, context) : []),
    kdoc(['Additional headers to send with the request.']) +
      '\nfun _additionalHeaders(): Headers = additionalHeaders',
    kdoc(['Additional query param to send with the request.']) +
      '\nfun _additionalQueryParams(): QueryParams = additionalQueryParams',
    'fun toBuilder() = Builder().from(this)',
    renderCompanion(model),
    renderBuilder(model),
    ...(model.body ? [renderBodyMethod(model.body)] : []),
    ...(model.params.some(param => param.location === 'path') ? [renderPathParam(model)] : []),
    renderHeadersOverride(model),
    renderQueryParamsOverride(model),
    ...(model.body?.kind === 'model'
      ? [renderNestedModelClass(model.body.model, context)]
      : []),
    ...model.params.flatMap(param => {
      const enumModel =
        param.type.kind === 'enum'
          ? param.type.enumModel
          : param.type.kind === 'list' && param.type.element.kind === 'enum'
            ? param.type.element.enumModel
            : undefined

      return enumModel
        ? [renderEnumClass(enumModel, context, { documentedValidate: true })]
        : []
    }),
    renderEquals(model),
    renderHashCode(model),
    renderToString(model)
  ]

  return `\n${sections.join('\n\n')}`
}

/** The class-level body accessors (typed/raw flattened pairs + `_additionalBodyProperties`). */
const renderBodyAccessors = (body: SdkBody, context: RenderContext): string[] => {
  switch (body.kind) {
    case 'model':
      // Grouped like the model sections: every typed accessor, then
      // every raw accessor (corpus: TransactionSimulateClearingParams).
      return [
        ...body.model.fields.map(field => renderFlattenedTypedAccessor(field, context)),
        ...body.model.fields.map(field => renderFlattenedRawAccessor(field)),
        'fun _additionalBodyProperties(): Map<String, JsonValue> = body._additionalProperties()'
      ]
    case 'ref': {
      const description = body.description ? `${kdoc([body.description])}\n` : ''

      return [
        `${description}fun ${body.kotlinName}(): ${body.className} = ${body.kotlinName}`,
        `fun _additionalBodyProperties(): Map<String, JsonValue> = ${body.kotlinName}._additionalProperties()`
      ]
    }
    case 'map':
      return [
        kdoc(['Additional body properties to send with the request.']) +
          '\nfun _additionalBodyProperties(): Map<String, JsonValue> = additionalBodyProperties'
      ]
    default: {
      const _exhaustive: never = body
      throw new Error(`Unhandled SdkBody: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

const renderFlattenedTypedAccessor = (field: SdkField, context: RenderContext): string => {
  const typeExpression = toTypeExpression(field.type)
  const lines = field.description ? [field.description, ''] : []
  lines.push(field.docRequired ? requiredThrows(context) : optionalThrows(context))

  const accessor =
    field.required && !field.nullable
      ? `fun ${field.kotlinName}(): ${typeExpression} = body.${field.kotlinName}()`
      : `fun ${field.kotlinName}(): ${typeExpression}? = body.${field.kotlinName}()`

  return `${kdoc(lines)}\n${accessor}`
}

const renderFlattenedRawAccessor = (field: SdkField): string => {
  const typeExpression = toTypeExpression(field.type)

  return (
    kdoc([
      `Returns the raw JSON value of [${field.kotlinName}].`,
      '',
      `Unlike [${field.kotlinName}], this method doesn't throw if the JSON field has an unexpected type.`
    ]) + `\nfun _${field.kotlinName}(): JsonField<${typeExpression}> = body._${field.kotlinName}()`
  )
}

const renderBodyMethod = (body: SdkBody): string => {
  switch (body.kind) {
    case 'model':
      return `fun _body(): ${body.model.className} = body`
    case 'ref':
      return `fun _body(): ${body.className} = ${body.kotlinName}`
    case 'map':
      return 'fun _body(): Map<String, JsonValue>? = additionalBodyProperties.ifEmpty { null }'
    default: {
      const _exhaustive: never = body
      throw new Error(`Unhandled SdkBody: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

const renderAccessor = (param: SdkParam): string => {
  const description = param.description ? `${kdoc([param.description])}\n` : ''
  const nullable = param.required ? '' : '?'

  return `${description}fun ${param.kotlinName}(): ${typeOf(param)}${nullable} = ${param.kotlinName}`
}

const renderCompanion = (model: SdkParams): string => {
  const fenced = fenceNames(model)

  const fence = fenced.length
    ? [
        '',
        'The following fields are required:',
        '```kotlin',
        ...fenced.map(name => `.${name}()`),
        '```'
      ]
    : []

  const members = [
    ...(modelHasNone(model) ? [`fun none(): ${model.className} = builder().build()`] : []),
    kdoc([
      `Returns a mutable builder for constructing an instance of [${model.className}].`,
      ...fence
    ]) + '\nfun builder() = Builder()'
  ]

  return `companion object {\n\n${indent(members.join('\n\n'), 1)}\n}`
}

const renderBuilder = (model: SdkParams): string => {
  const fromParameter = decapitalize(model.className)
  const { body: sdkBody } = model
  const fenced = fenceNames(model)

  const bodyVariable =
    sdkBody?.kind === 'model'
      ? [`private var body: ${sdkBody.model.className}.Builder = ${sdkBody.model.className}.builder()`]
      : sdkBody?.kind === 'ref'
        ? [`private var ${sdkBody.kotlinName}: ${sdkBody.className}? = null`]
        : []

  const mapVariable =
    sdkBody?.kind === 'map'
      ? ['private var additionalBodyProperties: MutableMap<String, JsonValue> = mutableMapOf()']
      : []

  const variables = [
    ...model.params.map(param =>
      param.type.kind === 'list'
        ? `private var ${param.kotlinName}: MutableList<${toParamTypeExpression(param.type.element)}>? = null`
        : `private var ${param.kotlinName}: ${typeOf(param)}? = null`
    ),
    ...bodyVariable,
    'private var additionalHeaders: Headers.Builder = Headers.builder()',
    'private var additionalQueryParams: QueryParams.Builder = QueryParams.builder()',
    ...mapVariable
  ]

  const bodyFrom =
    sdkBody?.kind === 'model'
      ? [`body = ${fromParameter}.body.toBuilder()`]
      : sdkBody?.kind === 'ref'
        ? [`${sdkBody.kotlinName} = ${fromParameter}.${sdkBody.kotlinName}`]
        : []

  const mapFrom =
    sdkBody?.kind === 'map'
      ? [`additionalBodyProperties = ${fromParameter}.additionalBodyProperties.toMutableMap()`]
      : []

  const fromBlock =
    `internal fun from(${fromParameter}: ${model.className}) = apply {\n` +
    indent(
      [
        ...model.params.map(param =>
          param.type.kind === 'list'
            ? `${param.kotlinName} = ${fromParameter}.${param.kotlinName}${param.required ? '' : '?'}.toMutableList()`
            : `${param.kotlinName} = ${fromParameter}.${param.kotlinName}`
        ),
        ...bodyFrom,
        `additionalHeaders = ${fromParameter}.additionalHeaders.toBuilder()`,
        `additionalQueryParams = ${fromParameter}.additionalQueryParams.toBuilder()`,
        ...mapFrom
      ].join('\n'),
      1
    ) +
    '\n}'

  const setters = model.params.flatMap(param => renderSetters(param))

  // Block order varies by body shape (corpus): the model shape's body
  // setters + delegated additionalBodyProperties ops come BEFORE the
  // headers/query blocks; the map shape's self-managed ops come AFTER.
  const bodySetterBlocks =
    sdkBody?.kind === 'model'
      ? [...renderBodySetters(sdkBody.model), delegatedBodyPropertiesBlock]
      : sdkBody?.kind === 'ref'
        ? [renderRefBodySetter(sdkBody)]
        : []

  const mapBlocks = sdkBody?.kind === 'map' ? [selfManagedBodyPropertiesBlock] : []

  const bodyBuildArgument =
    sdkBody?.kind === 'model'
      ? ['body.build(),']
      : sdkBody?.kind === 'ref'
        ? [`checkRequired("${sdkBody.kotlinName}", ${sdkBody.kotlinName}),`]
        : []

  const mapBuildArgument = sdkBody?.kind === 'map' ? ['additionalBodyProperties.toImmutable(),'] : []

  const buildArguments = [
    ...model.params.map(param => {
      if (param.type.kind === 'list') {
        return param.required
          ? `checkRequired("${param.kotlinName}", ${param.kotlinName}).toImmutable(),`
          : `${param.kotlinName}?.toImmutable(),`
      }

      return param.required
        ? `checkRequired("${param.kotlinName}", ${param.kotlinName}),`
        : `${param.kotlinName},`
    }),
    ...bodyBuildArgument,
    'additionalHeaders.build(),',
    'additionalQueryParams.build(),',
    ...mapBuildArgument
  ]

  const constructionRequired =
    model.params.some(param => param.required) || bodyHasRequired(sdkBody)

  const buildKdoc = kdoc([
    `Returns an immutable instance of [${model.className}].`,
    '',
    'Further updates to this [Builder] will not mutate the returned instance.',
    ...(fenced.length
      ? ['', 'The following fields are required:', '```kotlin', ...fenced.map(name => `.${name}()`), '```']
      : []),
    ...(constructionRequired
      ? ['', '@throws IllegalStateException if any required field is unset.']
      : [])
  ])

  const buildBlock =
    `${buildKdoc}\n` +
    `fun build(): ${model.className} =\n` +
    `    ${model.className}(\n` +
    indent(buildArguments.join('\n'), 2) +
    '\n    )'

  const body = [
    variables.join('\n'),
    fromBlock,
    ...setters,
    ...bodySetterBlocks,
    additionalsBlock,
    ...mapBlocks,
    buildBlock
  ].join('\n\n')

  return `${kdoc([`A builder for [${model.className}].`])}\nclass Builder internal constructor() {\n\n${indent(body, 1)}\n}`
}

/** The flattened per-field setter family delegating into the Body builder. */
const renderBodySetters = (bodyModel: SdkModel): string[] => {
  const { className, fields } = bodyModel
  const links = fields.map(field => `- [${field.kotlinName}]`)
  // The corpus shows at most five links, appending `- etc.` from
  // five fields up (TransferCreateParams: exactly five + etc.).
  const shown = links.length >= 5 ? [...links.slice(0, 5), '- etc.'] : links

  const bodySetter =
    kdoc([
      'Sets the entire request body.',
      '',
      "This is generally only useful if you are already constructing the body separately. Otherwise, it's more convenient to use the top-level setters instead:",
      ...shown
    ]) + `\nfun body(body: ${className}) = apply { this.body = body.toBuilder() }`

  const fieldSetters = fields.flatMap(field => {
    const { kotlinName } = field
    const typeExpression = toTypeExpression(field.type)
    const descriptionKdoc = field.description ? `${kdoc([field.description])}\n` : ''

    const typedParameter = field.nullable ? `${typeExpression}?` : typeExpression

    const blocks = [
      `${descriptionKdoc}fun ${kotlinName}(${kotlinName}: ${typedParameter}) = apply { body.${kotlinName}(${kotlinName}) }`,
      `${rawJsonSetterKdoc(field)}\nfun ${kotlinName}(${kotlinName}: JsonField<${typeExpression}>) = apply { body.${kotlinName}(${kotlinName}) }`
    ]

    if (field.type.kind === 'list') {
      const { addName, elementName, elementType } = toAddMethodInfo(kotlinName, field.type)

      blocks.push(
        `${addMethodKdoc(elementType, kotlinName)}\nfun ${addName}(${elementName}: ${elementType}) = apply { body.${addName}(${elementName}) }`
      )
    }

    return blocks
  })

  return [bodySetter, ...fieldSetters]
}

const renderRefBodySetter = (body: Extract<SdkBody, { kind: 'ref' }>): string => {
  const description = body.description ? `${kdoc([body.description])}\n` : ''

  return `${description}fun ${body.kotlinName}(${body.kotlinName}: ${body.className}) = apply {\n    this.${body.kotlinName} = ${body.kotlinName}\n}`
}

/** The model shape's additionalBodyProperties ops — delegating into the Body builder. */
const delegatedBodyPropertiesBlock = [
  'fun additionalBodyProperties(additionalBodyProperties: Map<String, JsonValue>) = apply {\n' +
    '    body.additionalProperties(additionalBodyProperties)\n' +
    '}',
  'fun putAdditionalBodyProperty(key: String, value: JsonValue) = apply {\n' +
    '    body.putAdditionalProperty(key, value)\n' +
    '}',
  'fun putAllAdditionalBodyProperties(additionalBodyProperties: Map<String, JsonValue>) =\n' +
    '    apply {\n' +
    '        body.putAllAdditionalProperties(additionalBodyProperties)\n' +
    '    }',
  'fun removeAdditionalBodyProperty(key: String) = apply { body.removeAdditionalProperty(key) }',
  'fun removeAllAdditionalBodyProperties(keys: Set<String>) = apply {\n' +
    '    body.removeAllAdditionalProperties(keys)\n' +
    '}'
].join('\n\n')

/** The map shape's self-managed additionalBodyProperties ops. */
const selfManagedBodyPropertiesBlock = [
  'fun additionalBodyProperties(additionalBodyProperties: Map<String, JsonValue>) = apply {\n' +
    '    this.additionalBodyProperties.clear()\n' +
    '    putAllAdditionalBodyProperties(additionalBodyProperties)\n' +
    '}',
  'fun putAdditionalBodyProperty(key: String, value: JsonValue) = apply {\n' +
    '    additionalBodyProperties.put(key, value)\n' +
    '}',
  'fun putAllAdditionalBodyProperties(additionalBodyProperties: Map<String, JsonValue>) =\n' +
    '    apply {\n' +
    '        this.additionalBodyProperties.putAll(additionalBodyProperties)\n' +
    '    }',
  'fun removeAdditionalBodyProperty(key: String) = apply {\n' +
    '    additionalBodyProperties.remove(key)\n' +
    '}',
  'fun removeAllAdditionalBodyProperties(keys: Set<String>) = apply {\n' +
    '    keys.forEach(::removeAdditionalBodyProperty)\n' +
    '}'
].join('\n\n')

const renderSetters = (param: SdkParam): string[] => {
  const { kotlinName } = param
  const description = param.description ? `${kdoc([param.description])}\n` : ''
  const typeExpression = typeOf(param)

  if (param.type.kind === 'list') {
    const elementType = toParamTypeExpression(param.type.element)
    const elementName = toSingular(kotlinName)
    const addName = `add${capitalize(elementName)}`
    const nullable = param.required ? '' : '?'

    return [
      `${description}fun ${kotlinName}(${kotlinName}: ${typeExpression}${nullable}) = apply {\n` +
        `    this.${kotlinName} = ${kotlinName}${nullable}.toMutableList()\n` +
        '}',
      `${addMethodKdoc(elementType, kotlinName)}\n` +
        `fun ${addName}(${elementName}: ${elementType}) = apply {\n` +
        `    ${kotlinName} = (${kotlinName} ?: mutableListOf()).apply { add(${elementName}) }\n` +
        '}'
    ]
  }

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

  const arms = pathParams.map((param, index) => {
    const isString = param.type.kind === 'scalar' && param.type.kotlin === 'String'
    const value = isString
      ? `${param.kotlinName}${param.required ? '' : ' ?: ""'}`
      : param.required
        ? `${param.kotlinName}.toString()`
        : `${param.kotlinName}?.toString() ?: ""`

    return `${index} -> ${value}`
  })

  return (
    'fun _pathParam(index: Int): String =\n' +
    '    when (index) {\n' +
    indent([...arms, 'else -> ""'].join('\n'), 2) +
    '\n    }'
  )
}

const stringifyParam = (param: SdkParam, expression: string): string => {
  if (param.type.kind === 'datetime') {
    // LocalDate serializes via plain toString; only OffsetDateTime
    // goes through the ISO formatter (corpus evidence).
    return param.type.date === 'local-date'
      ? `${expression}.toString()`
      : `DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(${expression})`
  }

  if (param.type.kind === 'list') {
    // Comma-joined; non-string elements stringify per element (corpus:
    // `transaction_tokens` vs `account_types`).
    const isStringElement =
      param.type.element.kind === 'scalar' && param.type.element.kotlin === 'String'

    return isStringElement
      ? `${expression}.joinToString(",")`
      : `${expression}.joinToString(",") { it.toString() }`
  }

  return param.type.kind === 'scalar' && param.type.kotlin === 'String'
    ? expression
    : `${expression}.toString()`
}

const renderParamPut = (param: SdkParam): string => {
  return param.required
    ? `put("${param.wireName}", ${stringifyParam(param, param.kotlinName)})`
    : `${param.kotlinName}?.let { put("${param.wireName}", ${stringifyParam(param, 'it')}) }`
}

const renderHeadersOverride = (model: SdkParams): string => {
  const headerParams = model.params.filter(param => param.location === 'header')

  if (!headerParams.length) {
    return 'override fun _headers(): Headers = additionalHeaders'
  }

  return (
    'override fun _headers(): Headers =\n' +
    '    Headers.builder()\n' +
    '        .apply {\n' +
    indent([...headerParams.map(renderParamPut), 'putAll(additionalHeaders)'].join('\n'), 3) +
    '\n        }\n' +
    '        .build()'
  )
}

const renderQueryParamsOverride = (model: SdkParams): string => {
  const queryParams = model.params.filter(param => param.location === 'query')

  if (!queryParams.length) {
    return 'override fun _queryParams(): QueryParams = additionalQueryParams'
  }

  return (
    'override fun _queryParams(): QueryParams =\n' +
    '    QueryParams.builder()\n' +
    '        .apply {\n' +
    indent([...queryParams.map(renderParamPut), 'putAll(additionalQueryParams)'].join('\n'), 3) +
    '\n        }\n' +
    '        .build()'
  )
}

const allNames = (model: SdkParams): string[] => [
  ...model.params.map(param => param.kotlinName),
  ...(model.body?.kind === 'model'
    ? ['body']
    : model.body?.kind === 'ref'
      ? [model.body.kotlinName]
      : []),
  'additionalHeaders',
  'additionalQueryParams',
  ...(model.body?.kind === 'map' ? ['additionalBodyProperties'] : [])
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
