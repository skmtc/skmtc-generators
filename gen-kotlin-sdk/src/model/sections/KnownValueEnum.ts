import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { sdkConfig as config } from '@/config.ts'
import { exceptionName } from '@/errors.ts'
import { indent, kdoc } from '@/format.ts'
import { toConstantCase } from '@/naming.ts'

type Args = {
  context: GenerateContextType
  className: string
  /** Wire values, in spec order. */
  members: string[]
  description?: string
  destinationPath: string
  /**
   * Params-context enums document their `validate()` with the full
   * KDoc block; model-context enums render it bare (corpus contrast:
   * ReportProblem `Code` vs References `Reason`).
   */
  documentedValidate?: boolean
}

/** The Known/Value enum-class family (§C3; corpus `Reason` shape). */
export class KnownValueEnum extends KtSnippet {
  className: string
  members: string[]
  description: string | undefined
  documentedValidate: boolean

  constructor({ context, className, members, description, destinationPath, documentedValidate }: Args) {
    super({ context })
    this.className = className
    this.members = members
    this.description = description
    this.documentedValidate = documentedValidate === true

    this.register({
      imports: {
        'com.fasterxml.jackson.annotation': ['JsonCreator'],
        [`${config.basePackage}.core`]: ['Enum', 'JsonField'],
        [`${config.basePackage}.errors`]: [exceptionName]
      },
      destinationPath
    })
  }

  override toString(): string {
    const { className, members } = this
    const exceptionPrefix = config.clientPrefix
    const constants = members.map(member => toConstantCase(member))

    const description = this.description
      ? `${kdoc([this.description])}\n`
      : ''

    const companionConstants = members
      .map(member => `val ${toConstantCase(member)} = of("${member}")`)
      .join('\n\n')

    const valueArms = constants.map(constant => `${constant} -> Value.${constant}`).join('\n')
    const knownArms = constants.map(constant => `${constant} -> Known.${constant}`).join('\n')

    const body = [
      `${kdoc([
        "Returns this class instance's raw value.",
        '',
        "This is usually only useful if this instance was deserialized from data that doesn't match any known member, and you want to know that value. For example, if the SDK is on an older version than the API, then the API may respond with new members that the SDK is unaware of."
      ])}
@com.fasterxml.jackson.annotation.JsonValue fun _value(): JsonField<String> = value`,

      `companion object {\n\n${indent(`${companionConstants}\n\nfun of(value: String) = ${className}(JsonField.of(value))`, 1)}\n}`,

      `${kdoc([`An enum containing [${className}]'s known values.`])}\nenum class Known {\n${indent(constants.map(constant => `${constant},`).join('\n'), 1)}\n}`,

      kdoc([
        `An enum containing [${className}]'s known values, as well as an [_UNKNOWN] member.`,
        '',
        `An instance of [${className}] can contain an unknown value in a couple of cases:`,
        "- It was deserialized from data that doesn't match any known member. For example, if the SDK is on an older version than the API, then the API may respond with new members that the SDK is unaware of.",
        '- It was constructed with an arbitrary value using the [of] method.'
      ]) +
        `\nenum class Value {\n${indent(
          [
            ...constants.map(constant => `${constant},`),
            `${kdoc([`An enum member indicating that [${className}] was instantiated with an unknown value.`])}\n_UNKNOWN,`
          ].join('\n'),
          1
        )}\n}`,

      `${kdoc([
        "Returns an enum member corresponding to this class instance's value, or [Value._UNKNOWN] if the class was instantiated with an unknown value.",
        '',
        "Use the [known] method instead if you're certain the value is always known or if you want to throw for the unknown case."
      ])}
fun value(): Value =
    when (this) {
${indent(`${valueArms}\nelse -> Value._UNKNOWN`, 2)}
    }`,

      `${kdoc([
        "Returns an enum member corresponding to this class instance's value.",
        '',
        "Use the [value] method instead if you're uncertain the value is always known and don't want to throw for the unknown case.",
        '',
        `@throws ${exceptionPrefix}InvalidDataException if this class instance's value is a not a known member.`
      ])}
fun known(): Known =
    when (this) {
${indent(
        `${knownArms}\nelse -> throw ${exceptionPrefix}InvalidDataException("Unknown ${className}: $value")`,
        2
      )}
    }`,

      `${kdoc([
        "Returns this class instance's primitive wire representation.",
        '',
        "This differs from the [toString] method because that method is primarily for debugging and generally doesn't throw.",
        '',
        `@throws ${exceptionPrefix}InvalidDataException if this class instance's value does not have the expected primitive type.`
      ])}
fun asString(): String =
    _value().asString() ?: throw ${exceptionPrefix}InvalidDataException("Value is not a String")`,

      `private var validated: Boolean = false

${
        this.documentedValidate
          ? `${kdoc([
              'Validates that the types of all values in this object match their expected types recursively.',
              '',
              'This method is _not_ forwards compatible with new types from the API for existing fields.',
              '',
              `@throws ${exceptionPrefix}InvalidDataException if any value type in this object doesn't match its expected type.`
            ])}\n`
          : ''
      }fun validate(): ${className} = apply {
    if (validated) {
        return@apply
    }

    known()
    validated = true
}

fun isValid(): Boolean =
    try {
        validate()
        true
    } catch (e: ${exceptionPrefix}InvalidDataException) {
        false
    }`,

      `${kdoc([
        'Returns a score indicating how many valid values are contained in this object recursively.',
        '',
        'Used for best match union deserialization.'
      ])}
internal fun validity(): Int = if (value() == Value._UNKNOWN) 0 else 1`,

      `override fun equals(other: Any?): Boolean {
    if (this === other) {
        return true
    }

    return other is ${className} && value == other.value
}`,

      'override fun hashCode() = value.hashCode()',

      'override fun toString() = value.toString()'
    ].join('\n\n')

    return `${description}class ${className} @JsonCreator private constructor(private val value: JsonField<String>) : Enum {

${indent(body, 1)}
}`
  }
}
