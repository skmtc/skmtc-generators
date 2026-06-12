import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent, kdoc } from '@/format.ts'
import type { RenderContext } from '@/RenderContext.ts'
import { decapitalize, toTypeExpression, type SdkField, type SdkModel } from '@/model/SdkModel.ts'
import {
  addMethodKdoc,
  rawJsonSetterKdoc,
  requiredFieldsFence,
  toAddMethodInfo
} from '@/model/sections/builderDocs.ts'
import { toFieldTypeImports } from '@/model/sections/fieldTypeImports.ts'

type Args = {
  context: GenerateContextType
  model: SdkModel
  renderContext: RenderContext
  destinationPath: string
}

/** The nested `Builder` class: vars, `from()`, setter family, additionalProperties ops, `build()`. */
export class ModelBuilder extends KtSnippet {
  model: SdkModel

  constructor({ context, model, renderContext, destinationPath }: Args) {
    super({ context })
    this.model = model

    const coreNames = ['JsonField', 'JsonValue']

    if (model.fields.some(field => field.required)) {
      coreNames.push('checkRequired')
    }

    if (model.fields.some(field => field.type.kind === 'list')) {
      coreNames.push('checkKnown', 'toImmutable')
    }

    if (model.fields.some(field => !field.required || field.type.kind === 'list')) {
      coreNames.push('JsonMissing')
    }

    this.register({
      imports: {
        [`${renderContext.basePackage}.core`]: coreNames.sort(),
        ...toFieldTypeImports(model.fields, renderContext)
      },
      destinationPath
    })
  }

  override toString(): string {
    const { model } = this
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

    const fromBlock = `internal fun from(${fromParameter}: ${model.className}) = apply {
${indent(
      [
        ...fromAssignments,
        `additionalProperties = ${fromParameter}.additionalProperties.toMutableMap()`
      ].join('\n'),
      1
    )}
}`

    const setters = model.fields.flatMap(field => renderSetters(field))

    const additionalPropertiesOps = `fun additionalProperties(additionalProperties: Map<String, JsonValue>) = apply {
    this.additionalProperties.clear()
    putAllAdditionalProperties(additionalProperties)
}

fun putAdditionalProperty(key: String, value: JsonValue) = apply {
    additionalProperties.put(key, value)
}

fun putAllAdditionalProperties(additionalProperties: Map<String, JsonValue>) = apply {
    this.additionalProperties.putAll(additionalProperties)
}

fun removeAdditionalProperty(key: String) = apply { additionalProperties.remove(key) }

fun removeAllAdditionalProperties(keys: Set<String>) = apply {
    keys.forEach(::removeAdditionalProperty)
}`

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

    const buildBlock = `${buildKdoc}
fun build(): ${model.className} =
    ${model.className}(
${indent([...buildArguments, 'additionalProperties.toMutableMap(),'].join('\n'), 2)}
    )`

    const body = [
      variables
        .concat('private var additionalProperties: MutableMap<String, JsonValue> = mutableMapOf()')
        .join('\n'),
      fromBlock,
      ...setters,
      additionalPropertiesOps,
      buildBlock
    ].join('\n\n')

    return `${kdoc([`A builder for [${model.className}].`])}\nclass Builder internal constructor() {\n\n${indent(body, 1)}\n}`
  }
}

const renderSetters = (field: SdkField): string[] => {
  const { kotlinName } = field
  const typeExpression = toTypeExpression(field.type)
  const blocks: string[] = []

  const descriptionKdoc = field.description ? `${kdoc([field.description])}\n` : ''

  // Resolved-nullable fields take `T?` through `JsonField.ofNullable`.
  const typedSetter = field.nullable
    ? `fun ${kotlinName}(${kotlinName}: ${typeExpression}?) = ${kotlinName}(JsonField.ofNullable(${kotlinName}))`
    : `fun ${kotlinName}(${kotlinName}: ${typeExpression}) = ${kotlinName}(JsonField.of(${kotlinName}))`

  blocks.push(`${descriptionKdoc}${typedSetter}`)

  const rawKdoc = rawJsonSetterKdoc(field)

  if (field.type.kind === 'list') {
    blocks.push(
      `${rawKdoc}
fun ${kotlinName}(${kotlinName}: JsonField<${typeExpression}>) = apply {
    this.${kotlinName} = ${kotlinName}.map { it.toMutableList() }
}`
    )

    const { addName, elementName, elementType } = toAddMethodInfo(kotlinName, field.type)
    // When the add parameter collides with the field name
    // (`addList(list:)` on field `list`), the field reference needs
    // `this.` in the body and the Builder-qualified KDoc link.
    const collides = elementName === kotlinName
    const fieldReference = collides ? `this.${kotlinName}` : kotlinName
    const fieldLink = collides ? `Builder.${kotlinName}` : kotlinName

    blocks.push(
      `${addMethodKdoc(elementType, fieldLink)}
fun ${addName}(${elementName}: ${elementType}) = apply {
    ${fieldReference} =
        (${fieldReference} ?: JsonField.of(mutableListOf())).also {
            checkKnown("${kotlinName}", it).add(${elementName})
        }
}`
    )
  } else {
    blocks.push(
      `${rawKdoc}\nfun ${kotlinName}(${kotlinName}: JsonField<${typeExpression}>) = apply { this.${kotlinName} = ${kotlinName} }`
    )
  }

  return blocks
}
