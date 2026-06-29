import type { GenerateContextType, Stringable } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent, kdoc } from '@/format.ts'
import { decapitalize } from '@/naming.ts'
import type { BodySnippet } from '@/params/body/BodySnippet.ts'
import type { ParamField } from '@/params/ParamField.ts'

type Args = {
  context: GenerateContextType
  className: string
  params: ParamField[]
  body: BodySnippet
  fenceNames: string[]
}

/** The Builder class: vars, `from()`, setters, body contributions, the fixed additionals block, `build()`. */
export class ParamsBuilder extends KtSnippet {
  className: string
  params: ParamField[]
  body: BodySnippet
  fenceNames: string[]

  constructor({ context, className, params, body, fenceNames }: Args) {
    super({ context })
    this.className = className
    this.params = params
    this.body = body
    this.fenceNames = fenceNames
  }

  override toString(): string {
    const { className, params, body, fenceNames } = this
    const fromParameter = decapitalize(className)

    const variables = [
      ...params.map(param => param.builderVariable()),
      ...body.builderLeadVariables,
      'private var additionalHeaders: Headers.Builder = Headers.builder()',
      'private var additionalQueryParams: QueryParams.Builder = QueryParams.builder()',
      ...body.builderTailVariables
    ]

    const fromBlock = `internal fun from(${fromParameter}: ${className}) = apply {
${indent(
      [
        ...params.map(param => param.fromAssignment(fromParameter)),
        ...body.fromLeadAssignments(fromParameter),
        `additionalHeaders = ${fromParameter}.additionalHeaders.toBuilder()`,
        `additionalQueryParams = ${fromParameter}.additionalQueryParams.toBuilder()`,
        ...body.fromTailAssignments(fromParameter)
      ].join('\n'),
      1
    )}
}`

    const setters = params.flatMap(param => param.setterBlocks())

    const buildArguments = [
      ...params.map(param => param.buildArgument()),
      ...body.buildLeadArguments,
      'additionalHeaders.build(),',
      'additionalQueryParams.build(),',
      ...body.buildTailArguments
    ]

    const constructionRequired = params.some(param => param.required) || body.hasRequired

    const buildKdoc = kdoc([
      `Returns an immutable instance of [${className}].`,
      '',
      'Further updates to this [Builder] will not mutate the returned instance.',
      ...(fenceNames.length
        ? ['', 'The following fields are required:', '```kotlin', ...fenceNames.map(name => `.${name}()`), '```']
        : []),
      ...(constructionRequired
        ? ['', '@throws IllegalStateException if any required field is unset.']
        : [])
    ])

    const buildBlock = `${buildKdoc}
fun build(): ${className} =
    ${className}(
${indent(buildArguments.join('\n'), 2)}
    )`

    const sections: Stringable[] = [
      variables.join('\n'),
      fromBlock,
      ...setters,
      ...body.setterSections,
      additionalsBlock,
      ...body.tailSetterSections,
      buildBlock
    ]

    return `${kdoc([`A builder for [${className}].`])}\nclass Builder internal constructor() {\n\n${indent(sections.join('\n\n'), 1)}\n}`
  }
}

/** The fixed additional-headers/query-params Builder block (§D-3). */
const additionalsBlock = `fun additionalHeaders(additionalHeaders: Headers) = apply {
    this.additionalHeaders.clear()
    putAllAdditionalHeaders(additionalHeaders)
}

fun additionalHeaders(additionalHeaders: Map<String, Iterable<String>>) = apply {
    this.additionalHeaders.clear()
    putAllAdditionalHeaders(additionalHeaders)
}

fun putAdditionalHeader(name: String, value: String) = apply {
    additionalHeaders.put(name, value)
}

fun putAdditionalHeaders(name: String, values: Iterable<String>) = apply {
    additionalHeaders.put(name, values)
}

fun putAllAdditionalHeaders(additionalHeaders: Headers) = apply {
    this.additionalHeaders.putAll(additionalHeaders)
}

fun putAllAdditionalHeaders(additionalHeaders: Map<String, Iterable<String>>) = apply {
    this.additionalHeaders.putAll(additionalHeaders)
}

fun replaceAdditionalHeaders(name: String, value: String) = apply {
    additionalHeaders.replace(name, value)
}

fun replaceAdditionalHeaders(name: String, values: Iterable<String>) = apply {
    additionalHeaders.replace(name, values)
}

fun replaceAllAdditionalHeaders(additionalHeaders: Headers) = apply {
    this.additionalHeaders.replaceAll(additionalHeaders)
}

fun replaceAllAdditionalHeaders(additionalHeaders: Map<String, Iterable<String>>) = apply {
    this.additionalHeaders.replaceAll(additionalHeaders)
}

fun removeAdditionalHeaders(name: String) = apply { additionalHeaders.remove(name) }

fun removeAllAdditionalHeaders(names: Set<String>) = apply {
    additionalHeaders.removeAll(names)
}

fun additionalQueryParams(additionalQueryParams: QueryParams) = apply {
    this.additionalQueryParams.clear()
    putAllAdditionalQueryParams(additionalQueryParams)
}

fun additionalQueryParams(additionalQueryParams: Map<String, Iterable<String>>) = apply {
    this.additionalQueryParams.clear()
    putAllAdditionalQueryParams(additionalQueryParams)
}

fun putAdditionalQueryParam(key: String, value: String) = apply {
    additionalQueryParams.put(key, value)
}

fun putAdditionalQueryParams(key: String, values: Iterable<String>) = apply {
    additionalQueryParams.put(key, values)
}

fun putAllAdditionalQueryParams(additionalQueryParams: QueryParams) = apply {
    this.additionalQueryParams.putAll(additionalQueryParams)
}

fun putAllAdditionalQueryParams(additionalQueryParams: Map<String, Iterable<String>>) =
    apply {
        this.additionalQueryParams.putAll(additionalQueryParams)
    }

fun replaceAdditionalQueryParams(key: String, value: String) = apply {
    additionalQueryParams.replace(key, value)
}

fun replaceAdditionalQueryParams(key: String, values: Iterable<String>) = apply {
    additionalQueryParams.replace(key, values)
}

fun replaceAllAdditionalQueryParams(additionalQueryParams: QueryParams) = apply {
    this.additionalQueryParams.replaceAll(additionalQueryParams)
}

fun replaceAllAdditionalQueryParams(additionalQueryParams: Map<String, Iterable<String>>) =
    apply {
        this.additionalQueryParams.replaceAll(additionalQueryParams)
    }

fun removeAdditionalQueryParams(key: String) = apply { additionalQueryParams.remove(key) }

fun removeAllAdditionalQueryParams(keys: Set<String>) = apply {
    additionalQueryParams.removeAll(keys)
}`
