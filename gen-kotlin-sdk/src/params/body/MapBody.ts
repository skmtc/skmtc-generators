import type { GenerateContextType, Stringable } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { kdoc } from '@/format.ts'
import { sdkConfig as config } from '@/config.ts'

type Args = {
  context: GenerateContextType
  destinationPath: string
}

/**
 * The no-spec-requestBody shape on a body-capable verb: only the
 * `additionalBodyProperties` axis, sitting AFTER the headers/query
 * members everywhere (corpus: AuthRuleV2DeleteParams).
 */
export class MapBody extends KtSnippet {
  constructorLeadLines: string[] = []
  constructorTailLines = ['private val additionalBodyProperties: Map<String, JsonValue>,']
  accessorSections: Stringable[]
  builderLeadVariables: string[] = []
  builderTailVariables = [
    'private var additionalBodyProperties: MutableMap<String, JsonValue> = mutableMapOf()'
  ]
  setterSections: Stringable[] = []
  tailSetterSections: Stringable[]
  buildLeadArguments: string[] = []
  buildTailArguments = ['additionalBodyProperties.toImmutable(),']
  bodyMethodSections = [
    'fun _body(): Map<String, JsonValue>? = additionalBodyProperties.ifEmpty { null }'
  ]
  nestedSections: Stringable[] = []
  equalsLeadNames: string[] = []
  equalsTailNames = ['additionalBodyProperties']
  hasRequired = false
  fenceFields: string[] = []

  constructor({ context, destinationPath }: Args) {
    super({ context })

    this.accessorSections = [
      kdoc(['Additional body properties to send with the request.']) +
        '\nfun _additionalBodyProperties(): Map<String, JsonValue> = additionalBodyProperties'
    ]

    this.tailSetterSections = [selfManagedBodyPropertiesBlock]

    this.register({
      imports: {
        [`${config.basePackage}.core`]: ['JsonValue', 'toImmutable']
      },
      destinationPath
    })
  }

  fromLeadAssignments(_fromParameter: string): string[] {
    return []
  }

  fromTailAssignments(fromParameter: string): string[] {
    return [`additionalBodyProperties = ${fromParameter}.additionalBodyProperties.toMutableMap()`]
  }

  override toString(): string {
    return ''
  }
}

/** The map shape's self-managed additionalBodyProperties ops. */
const selfManagedBodyPropertiesBlock = `fun additionalBodyProperties(additionalBodyProperties: Map<String, JsonValue>) = apply {
    this.additionalBodyProperties.clear()
    putAllAdditionalBodyProperties(additionalBodyProperties)
}

fun putAdditionalBodyProperty(key: String, value: JsonValue) = apply {
    additionalBodyProperties.put(key, value)
}

fun putAllAdditionalBodyProperties(additionalBodyProperties: Map<String, JsonValue>) =
    apply {
        this.additionalBodyProperties.putAll(additionalBodyProperties)
    }

fun removeAdditionalBodyProperty(key: String) = apply {
    additionalBodyProperties.remove(key)
}

fun removeAllAdditionalBodyProperties(keys: Set<String>) = apply {
    keys.forEach(::removeAdditionalBodyProperty)
}`
