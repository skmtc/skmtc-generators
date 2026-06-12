import { capitalize } from '@skmtc/core'
import {
  decapitalize,
  isValidatable,
  toConstantCase,
  toTypeExpression,
  type SdkEnum,
  type SdkField,
  type SdkModel,
  type SdkType
} from './SdkModel.ts'

/**
 * Rendering context threaded through every section: the exception
 * prefix (`OnebusawaySdk` → `OnebusawaySdkInvalidDataException`) and
 * the envelope class name + field order for `toResponseWrapper()`.
 */
export type RenderContext = {
  exceptionPrefix: string
  /** Absent on targets without a response envelope. */
  envelope?: { className: string; fields: string[] }
}

const indentUnit = '    '

export const indent = (text: string, levels: number): string => {
  const prefix = indentUnit.repeat(levels)

  return text
    .split('\n')
    .map(line => (line.length ? `${prefix}${line}` : line))
    .join('\n')
}

export const kdoc = (lines: string[]): string => {
  return ['/**', ...lines.map(line => (line.length ? ` * ${line}` : ' *')), ' */'].join('\n')
}

/** Primary-constructor parameter list (the `KtConstructed` protocol value). */
export const renderPrimaryConstructorParameters = (model: SdkModel): string => {
  const fieldLines = model.fields.map(
    field => `private val ${field.kotlinName}: JsonField<${toTypeExpression(field.type)}>,`
  )

  return indent(
    [...fieldLines, 'private val additionalProperties: MutableMap<String, JsonValue>,'].join('\n'),
    1
  )
}

export const constructorModifiers = '@JsonCreator(mode = JsonCreator.Mode.DISABLED) private'

/** The full class body — every §C3 section in corpus order. */
export const renderModelBody = (model: SdkModel, context: RenderContext): string => {
  const sections = [
    renderSecondaryConstructor(model),
    ...(model.envelope ? [renderEnvelopeConversion(context)] : []),
    ...model.fields.map(field => renderTypedAccessor(field, context)),
    ...model.fields.map(field => renderRawAccessor(field)),
    renderAdditionalPropertiesAccessors(),
    'fun toBuilder() = Builder().from(this)',
    renderCompanion(model),
    renderBuilder(model),
    renderValidateBlock(model, context),
    renderValidity(model),
    ...collectNestedTypes(model).map(nested =>
      nested.kind === 'model'
        ? renderNestedModelClass(nested.model, context)
        : renderEnumClass(nested.enumModel, context)
    ),
    renderEquals(model),
    renderHashCode(model),
    renderToString(model)
  ]

  return `\n${sections.join('\n\n')}`
}

/** A nested class: declaration + recursive body. */
export const renderNestedModelClass = (model: SdkModel, context: RenderContext): string => {
  const description = model.description ? `${kdoc([model.description])}\n` : ''

  return (
    `${description}class ${model.className}\n` +
    `@JsonCreator(mode = JsonCreator.Mode.DISABLED)\n` +
    `private constructor(\n` +
    `${renderPrimaryConstructorParameters(model)}\n` +
    `) {\n` +
    `${indent(renderModelBody(model, context), 1)}\n` +
    `}`
  )
}

const renderSecondaryConstructor = (model: SdkModel): string => {
  const parameters = model.fields
    .map(
      field =>
        `@JsonProperty("${field.wireName}") @ExcludeMissing ${field.kotlinName}: ` +
        `JsonField<${toTypeExpression(field.type)}> = JsonMissing.of(),`
    )
    .join('\n')

  const forwarded = [...model.fields.map(field => field.kotlinName), 'mutableMapOf()'].join(', ')

  return `@JsonCreator\nprivate constructor(\n${indent(parameters, 1)}\n) : this(${forwarded})`
}

const renderEnvelopeConversion = (context: RenderContext): string => {
  if (!context.envelope) {
    throw new Error('@skmtc/gen-kotlin-sdk: envelope section rendered without envelope config')
  }

  const chain = context.envelope.fields.map(field => `    .${field}(${field})`).join('\n')

  return (
    `fun to${context.envelope.className}(): ${context.envelope.className} =\n` +
    `    ${context.envelope.className}.builder()\n${indent(chain, 1)}\n        .build()`
  )
}

const requiredThrows = (context: RenderContext): string =>
  `@throws ${context.exceptionPrefix}InvalidDataException if the JSON field has an unexpected type or is unexpectedly missing or null (e.g. if the server responded with an unexpected value).`

const optionalThrows = (context: RenderContext): string =>
  `@throws ${context.exceptionPrefix}InvalidDataException if the JSON field has an unexpected type (e.g. if the server responded with an unexpected value).`

const renderTypedAccessor = (field: SdkField, context: RenderContext): string => {
  const typeExpression = toTypeExpression(field.type)
  const lines = field.description ? [field.description, ''] : []
  lines.push(field.docRequired ? requiredThrows(context) : optionalThrows(context))

  const accessor =
    field.required && !field.nullable
      ? `fun ${field.kotlinName}(): ${typeExpression} = ${field.kotlinName}.getRequired("${field.wireName}")`
      : `fun ${field.kotlinName}(): ${typeExpression}? = ${field.kotlinName}.getNullable("${field.wireName}")`

  return `${kdoc(lines)}\n${accessor}`
}

const renderRawAccessor = (field: SdkField): string => {
  const typeExpression = toTypeExpression(field.type)

  return (
    kdoc([
      `Returns the raw JSON value of [${field.kotlinName}].`,
      '',
      `Unlike [${field.kotlinName}], this method doesn't throw if the JSON field has an unexpected type.`
    ]) +
    `\n@JsonProperty("${field.wireName}") @ExcludeMissing fun _${field.kotlinName}(): ` +
    `JsonField<${typeExpression}> = ${field.kotlinName}`
  )
}

const renderAdditionalPropertiesAccessors = (): string => {
  return (
    '@JsonAnySetter\n' +
    'private fun putAdditionalProperty(key: String, value: JsonValue) {\n' +
    '    additionalProperties.put(key, value)\n' +
    '}\n' +
    '\n' +
    '@JsonAnyGetter\n' +
    '@ExcludeMissing\n' +
    'fun _additionalProperties(): Map<String, JsonValue> =\n' +
    '    Collections.unmodifiableMap(additionalProperties)'
  )
}

const requiredFieldsFence = (model: SdkModel): string[] => {
  const requiredFields = model.fields.filter(field => field.fenceRequired)

  if (!requiredFields.length) {
    return []
  }

  return [
    '',
    'The following fields are required:',
    '```kotlin',
    ...requiredFields.map(field => `.${field.kotlinName}()`),
    '```'
  ]
}

const renderCompanion = (model: SdkModel): string => {
  const lines = [
    `Returns a mutable builder for constructing an instance of [${model.className}].`,
    ...requiredFieldsFence(model)
  ]

  return `companion object {\n\n${indent(`${kdoc(lines)}\nfun builder() = Builder()`, 1)}\n}`
}

const renderBuilder = (model: SdkModel, ): string => {
  const fromParameter = decapitalize(model.className)

  const variables = model.fields.map(field => {
    // List vars are ALWAYS the nullable form — the addX accumulator
    // needs the null sentinel even for optional lists (corpus:
    // References.Situation optional list fields).
    if (field.type.kind === 'list') {
      return `private var ${field.kotlinName}: JsonField<MutableList<${toTypeExpression(field.type.element)}>>? = null`
    }

    const storedType = `JsonField<${toTypeExpression(field.type)}>`

    return field.required
      ? `private var ${field.kotlinName}: ${storedType}? = null`
      : `private var ${field.kotlinName}: ${storedType} = JsonMissing.of()`
  })

  const fromAssignments = model.fields.map(field => {
    // A field named like the from() parameter needs `this.`
    // (`class Status` holding a `status` field).
    const target =
      field.kotlinName === fromParameter ? `this.${field.kotlinName}` : field.kotlinName

    return field.type.kind === 'list'
      ? `${target} = ${fromParameter}.${field.kotlinName}.map { it.toMutableList() }`
      : `${target} = ${fromParameter}.${field.kotlinName}`
  })

  const fromBlock =
    `internal fun from(${fromParameter}: ${model.className}) = apply {\n` +
    indent(
      [
        ...fromAssignments,
        `additionalProperties = ${fromParameter}.additionalProperties.toMutableMap()`
      ].join('\n'),
      1
    ) +
    '\n}'

  const setters = model.fields.flatMap(field => renderSetters(field))

  const additionalPropertiesOps =
    'fun additionalProperties(additionalProperties: Map<String, JsonValue>) = apply {\n' +
    '    this.additionalProperties.clear()\n' +
    '    putAllAdditionalProperties(additionalProperties)\n' +
    '}\n' +
    '\n' +
    'fun putAdditionalProperty(key: String, value: JsonValue) = apply {\n' +
    '    additionalProperties.put(key, value)\n' +
    '}\n' +
    '\n' +
    'fun putAllAdditionalProperties(additionalProperties: Map<String, JsonValue>) = apply {\n' +
    '    this.additionalProperties.putAll(additionalProperties)\n' +
    '}\n' +
    '\n' +
    'fun removeAdditionalProperty(key: String) = apply { additionalProperties.remove(key) }\n' +
    '\n' +
    'fun removeAllAdditionalProperties(keys: Set<String>) = apply {\n' +
    '    keys.forEach(::removeAdditionalProperty)\n' +
    '}'

  const buildArguments = model.fields.map(field => {
    if (field.type.kind === 'list') {
      return field.required
        ? `checkRequired("${field.kotlinName}", ${field.kotlinName}).map { it.toImmutable() },`
        : `(${field.kotlinName} ?: JsonMissing.of()).map { it.toImmutable() },`
    }

    return field.required
      ? `checkRequired("${field.kotlinName}", ${field.kotlinName}),`
      : `${field.kotlinName},`
  })

  const buildKdoc = kdoc([
    `Returns an immutable instance of [${model.className}].`,
    '',
    'Further updates to this [Builder] will not mutate the returned instance.',
    ...requiredFieldsFence(model),
    ...(model.fields.some(field => field.required)
      ? ['', '@throws IllegalStateException if any required field is unset.']
      : [])
  ])

  const buildBlock =
    `${buildKdoc}\n` +
    `fun build(): ${model.className} =\n` +
    `    ${model.className}(\n` +
    indent([...buildArguments, 'additionalProperties.toMutableMap(),'].join('\n'), 2) +
    '\n    )'

  const body = [
    variables.concat('private var additionalProperties: MutableMap<String, JsonValue> = mutableMapOf()').join('\n'),
    fromBlock,
    ...setters,
    additionalPropertiesOps,
    buildBlock
  ].join('\n\n')

  return `${kdoc([`A builder for [${model.className}].`])}\nclass Builder internal constructor() {\n\n${indent(body, 1)}\n}`
}

const renderSetters = (field: SdkField): string[] => {
  const { kotlinName, wireName } = field
  const typeExpression = toTypeExpression(field.type)
  const blocks: string[] = []

  const descriptionKdoc = field.description ? `${kdoc([field.description])}\n` : ''

  // Resolved-nullable fields take `T?` through `JsonField.ofNullable`.
  const typedSetter = field.nullable
    ? `fun ${kotlinName}(${kotlinName}: ${typeExpression}?) = ${kotlinName}(JsonField.ofNullable(${kotlinName}))`
    : `fun ${kotlinName}(${kotlinName}: ${typeExpression}) = ${kotlinName}(JsonField.of(${kotlinName}))`

  blocks.push(`${descriptionKdoc}${typedSetter}`)

  // Doc references use the UNQUALIFIED form even when the code is
  // shadow-qualified (`kotlin.collections.List`).
  const docTypeExpression = toDocTypeExpression(field.type)
  const wellTyped =
    field.type.kind === 'list' ? `\`${docTypeExpression}\`` : `[${docTypeExpression}]`

  const rawKdoc = kdoc([
    `Sets [Builder.${kotlinName}] to an arbitrary JSON value.`,
    '',
    `You should usually call [Builder.${kotlinName}] with a well-typed ${wellTyped} value instead. This method is primarily for setting the field to an undocumented or not yet supported value.`
  ])

  if (field.type.kind === 'list') {
    blocks.push(
      `${rawKdoc}\n` +
        `fun ${kotlinName}(${kotlinName}: JsonField<${typeExpression}>) = apply {\n` +
        `    this.${kotlinName} = ${kotlinName}.map { it.toMutableList() }\n` +
        '}'
    )

    const elementType = toTypeExpression(field.type.element)
    // Model elements name the add method/parameter after the class
    // (`addAgency(agency: Agency)`); scalar elements after the
    // singularized field (`addRouteId(routeId: String)`).
    const isScalarElement = field.type.element.kind === 'scalar'
    const elementName = isScalarElement ? singularName(kotlinName) : decapitalize(elementType)
    const addName = `add${capitalize(elementName)}`
    // When the add parameter collides with the field name
    // (`addList(list:)` on field `list`), the field reference needs
    // `this.` in the body and the Builder-qualified KDoc link.
    const collides = elementName === kotlinName
    const fieldReference = collides ? `this.${kotlinName}` : kotlinName
    const fieldLink = collides ? `Builder.${kotlinName}` : kotlinName

    blocks.push(
      kdoc([
        `Adds a single [${elementType}] to [${fieldLink}].`,
        '',
        '@throws IllegalStateException if the field was previously set to a non-list.'
      ]) +
        `\nfun ${addName}(${elementName}: ${elementType}) = apply {\n` +
        `    ${fieldReference} =\n` +
        `        (${fieldReference} ?: JsonField.of(mutableListOf())).also {\n` +
        `            checkKnown("${wireName}", it).add(${elementName})\n` +
        '        }\n' +
        '}'
    )
  } else {
    blocks.push(
      `${rawKdoc}\nfun ${kotlinName}(${kotlinName}: JsonField<${typeExpression}>) = apply { this.${kotlinName} = ${kotlinName} }`
    )
  }

  return blocks
}

const toDocTypeExpression = (type: SdkType): string => {
  if (type.kind === 'list') {
    return `List<${toDocTypeExpression(type.element)}>`
  }

  return toTypeExpression(type)
}

const singularName = (name: string): string => {
  if (name.endsWith('ies')) {
    return `${name.slice(0, -3)}y`
  }

  return name.endsWith('s') && !name.endsWith('ss') ? name.slice(0, -1) : name
}

const renderValidateBlock = (model: SdkModel, context: RenderContext): string => {
  const perField = model.fields.map(field => {
    const call = `${field.kotlinName}()`
    const optionalMark = field.required && !field.nullable ? '' : '?'

    if (field.type.kind === 'list' && isValidatable(field.type.element)) {
      return `${call}${optionalMark}.forEach { it.validate() }`
    }

    if (isValidatable(field.type)) {
      return `${call}${optionalMark}.validate()`
    }

    return call
  })

  return (
    'private var validated: Boolean = false\n' +
    '\n' +
    kdoc([
      'Validates that the types of all values in this object match their expected types recursively.',
      '',
      'This method is _not_ forwards compatible with new types from the API for existing fields.',
      '',
      `@throws ${context.exceptionPrefix}InvalidDataException if any value type in this object doesn't match its expected type.`
    ]) +
    '\n' +
    `fun validate(): ${model.className} = apply {\n` +
    '    if (validated) {\n' +
    '        return@apply\n' +
    '    }\n' +
    '\n' +
    indent([...perField, 'validated = true'].join('\n'), 1) +
    '\n}\n' +
    '\n' +
    'fun isValid(): Boolean =\n' +
    '    try {\n' +
    '        validate()\n' +
    '        true\n' +
    `    } catch (e: ${context.exceptionPrefix}InvalidDataException) {\n` +
    '        false\n' +
    '    }'
  )
}

const renderValidity = (model: SdkModel): string => {
  const terms = model.fields.map(field => {
    const name = field.kotlinName

    if (field.type.kind === 'list') {
      return isValidatable(field.type.element)
        ? `(${name}.asKnown()?.sumOf { it.validity().toInt() } ?: 0)`
        : `(${name}.asKnown()?.size ?: 0)`
    }

    if (isValidatable(field.type)) {
      return `(${name}.asKnown()?.validity() ?: 0)`
    }

    return `(if (${name}.asKnown() == null) 0 else 1)`
  })

  return (
    kdoc([
      'Returns a score indicating how many valid values are contained in this object recursively.',
      '',
      'Used for best match union deserialization.'
    ]) +
    '\ninternal fun validity(): Int =\n' +
    indent(terms.join(' +\n'), 1)
  )
}

const collectNestedTypes = (
  model: SdkModel
): ({ kind: 'model'; model: SdkModel } | { kind: 'enum'; enumModel: SdkEnum })[] => {
  return model.fields.flatMap(field => nestedTypesOf(field.type))
}

const nestedTypesOf = (
  type: SdkType
): ({ kind: 'model'; model: SdkModel } | { kind: 'enum'; enumModel: SdkEnum })[] => {
  switch (type.kind) {
    case 'model':
      return [{ kind: 'model', model: type.model }]
    case 'enum':
      return [{ kind: 'enum', enumModel: type.enumModel }]
    case 'list':
      return nestedTypesOf(type.element)
    case 'scalar':
    case 'shared':
      return []
    default: {
      const _exhaustive: never = type
      throw new Error(`Unhandled SdkType: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

const renderEquals = (model: SdkModel): string => {
  const comparisons = [...model.fields.map(field => field.kotlinName), 'additionalProperties']
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

const renderHashCode = (model: SdkModel): string => {
  const hashed = [...model.fields.map(field => field.kotlinName), 'additionalProperties'].join(', ')

  return `private val hashCode: Int by lazy { Objects.hash(${hashed}) }\n\noverride fun hashCode(): Int = hashCode`
}

const renderToString = (model: SdkModel): string => {
  const parts = [...model.fields.map(field => field.kotlinName), 'additionalProperties']
    .map(name => `${name}=$${name}`)
    .join(', ')

  return `override fun toString() =\n    "${model.className}{${parts}}"`
}

export type RenderEnumOptions = {
  /**
   * Params-context enums document their `validate()` with the full
   * KDoc block; model-context enums render it bare (corpus contrast:
   * ReportProblem `Code` vs References `Reason`).
   */
  documentedValidate?: boolean
}

/** The Known/Value enum-class family (§C3; corpus `Reason` shape). */
export const renderEnumClass = (
  enumModel: SdkEnum,
  context: RenderContext,
  options: RenderEnumOptions = {}
): string => {
  const { className, members } = enumModel
  const constants = members.map(member => toConstantCase(member))

  const description = enumModel.description ? `${kdoc([enumModel.description])}\n` : ''

  const companionConstants = members
    .map(member => `val ${toConstantCase(member)} = of("${member}")`)
    .join('\n\n')

  const valueArms = constants.map(constant => `${constant} -> Value.${constant}`).join('\n')
  const knownArms = constants.map(constant => `${constant} -> Known.${constant}`).join('\n')

  const body = [
    kdoc([
      "Returns this class instance's raw value.",
      '',
      "This is usually only useful if this instance was deserialized from data that doesn't match any known member, and you want to know that value. For example, if the SDK is on an older version than the API, then the API may respond with new members that the SDK is unaware of."
    ]) + '\n@com.fasterxml.jackson.annotation.JsonValue fun _value(): JsonField<String> = value',

    `companion object {\n\n${indent(`${companionConstants}\n\nfun of(value: String) = ${className}(JsonField.of(value))`, 1)}\n}`,

    `${kdoc([`An enum containing [${className}]'s known values.`])}\nenum class Known {\n${indent(constants.map(constant => `${constant},`).join('\n'), 1)}\n}`,

    kdoc([
      `An enum containing [${className}]'s known values, as well as an [_UNKNOWN] member.`,
      '',
      `An instance of [${className}] can contain an unknown value in a couple of cases:`,
      '- It was deserialized from data that doesn\'t match any known member. For example, if the SDK is on an older version than the API, then the API may respond with new members that the SDK is unaware of.',
      '- It was constructed with an arbitrary value using the [of] method.'
    ]) +
      `\nenum class Value {\n${indent(
        [
          ...constants.map(constant => `${constant},`),
          `${kdoc([`An enum member indicating that [${className}] was instantiated with an unknown value.`])}\n_UNKNOWN,`
        ].join('\n'),
        1
      )}\n}`,

    kdoc([
      "Returns an enum member corresponding to this class instance's value, or [Value._UNKNOWN] if the class was instantiated with an unknown value.",
      '',
      "Use the [known] method instead if you're certain the value is always known or if you want to throw for the unknown case."
    ]) +
      `\nfun value(): Value =\n    when (this) {\n${indent(`${valueArms}\nelse -> Value._UNKNOWN`, 2)}\n    }`,

    kdoc([
      "Returns an enum member corresponding to this class instance's value.",
      '',
      "Use the [value] method instead if you're uncertain the value is always known and don't want to throw for the unknown case.",
      '',
      `@throws ${context.exceptionPrefix}InvalidDataException if this class instance's value is a not a known member.`
    ]) +
      `\nfun known(): Known =\n    when (this) {\n${indent(
        `${knownArms}\nelse -> throw ${context.exceptionPrefix}InvalidDataException("Unknown ${className}: $value")`,
        2
      )}\n    }`,

    kdoc([
      "Returns this class instance's primitive wire representation.",
      '',
      'This differs from the [toString] method because that method is primarily for debugging and generally doesn\'t throw.',
      '',
      `@throws ${context.exceptionPrefix}InvalidDataException if this class instance's value does not have the expected primitive type.`
    ]) +
      '\nfun asString(): String =\n' +
      `    _value().asString() ?: throw ${context.exceptionPrefix}InvalidDataException("Value is not a String")`,

    'private var validated: Boolean = false\n' +
      '\n' +
      (options.documentedValidate
        ? kdoc([
            'Validates that the types of all values in this object match their expected types recursively.',
            '',
            'This method is _not_ forwards compatible with new types from the API for existing fields.',
            '',
            `@throws ${context.exceptionPrefix}InvalidDataException if any value type in this object doesn't match its expected type.`
          ]) + '\n'
        : '') +
      `fun validate(): ${className} = apply {\n` +
      '    if (validated) {\n' +
      '        return@apply\n' +
      '    }\n' +
      '\n' +
      '    known()\n' +
      '    validated = true\n' +
      '}\n' +
      '\n' +
      'fun isValid(): Boolean =\n' +
      '    try {\n' +
      '        validate()\n' +
      '        true\n' +
      `    } catch (e: ${context.exceptionPrefix}InvalidDataException) {\n` +
      '        false\n' +
      '    }',

    kdoc([
      'Returns a score indicating how many valid values are contained in this object recursively.',
      '',
      'Used for best match union deserialization.'
    ]) + '\ninternal fun validity(): Int = if (value() == Value._UNKNOWN) 0 else 1',

    'override fun equals(other: Any?): Boolean {\n' +
      '    if (this === other) {\n' +
      '        return true\n' +
      '    }\n' +
      '\n' +
      `    return other is ${className} && value == other.value\n` +
      '}',

    'override fun hashCode() = value.hashCode()',

    'override fun toString() = value.toString()'
  ].join('\n\n')

  return (
    `${description}class ${className} @JsonCreator private constructor(private val value: JsonField<String>) : Enum {\n\n` +
    `${indent(body, 1)}\n}`
  )
}
