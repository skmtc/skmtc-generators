import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { sdkConfig as config } from '@/config.ts'
import { indent, kdoc } from '@/format.ts'
import { decapitalize } from '@/naming.ts'
import { requiredFieldsFence, type ModelField } from '@/model/ModelField.ts'

type Args = {
  context: GenerateContextType
  className: string
  fields: ModelField[]
  destinationPath: string
}

/** The nested `Builder` class: vars, `from()`, the fields' setter families, additionalProperties ops, `build()`. */
export class ModelBuilder extends KtSnippet {
  className: string
  fields: ModelField[]

  constructor({ context, className, fields, destinationPath }: Args) {
    super({ context })
    this.className = className
    this.fields = fields

    this.register({
      imports: { [`${config.basePackage}.core`]: ['JsonField', 'JsonValue'] },
      destinationPath
    })
  }

  override toString(): string {
    const { className, fields } = this
    const fromParameter = decapitalize(className)

    const variables = fields.map(field => field.builderVariable())

    const fromBlock = `internal fun from(${fromParameter}: ${className}) = apply {
${indent(
      [
        ...fields.map(field => field.fromAssignment(fromParameter)),
        `additionalProperties = ${fromParameter}.additionalProperties.toMutableMap()`
      ].join('\n'),
      1
    )}
}`

    const setters = fields.flatMap(field => field.setterBlocks())

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

    const buildKdoc = kdoc([
      `Returns an immutable instance of [${className}].`,
      '',
      'Further updates to this [Builder] will not mutate the returned instance.',
      ...requiredFieldsFence(fields),
      ...(fields.some(field => field.required)
        ? ['', '@throws IllegalStateException if any required field is unset.']
        : [])
    ])

    const buildBlock = `${buildKdoc}
fun build(): ${className} =
    ${className}(
${indent(
      [...fields.map(field => field.buildArgument()), 'additionalProperties.toMutableMap(),'].join(
        '\n'
      ),
      2
    )}
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

    return `${kdoc([`A builder for [${className}].`])}\nclass Builder internal constructor() {\n\n${indent(body, 1)}\n}`
  }
}
