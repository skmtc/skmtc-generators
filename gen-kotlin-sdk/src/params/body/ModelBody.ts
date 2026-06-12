import type { GenerateContextType, Stringable } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { kdoc } from '@/format.ts'
import { optionalThrows, requiredThrows, type RenderContext } from '@/RenderContext.ts'
import { toTypeExpression, type SdkField, type SdkModel } from '@/model/SdkModel.ts'
import {
  addMethodKdoc,
  rawJsonSetterKdoc,
  toAddMethodInfo
} from '@/model/sections/builderDocs.ts'
import { NestedModelClass } from '@/model/sections/NestedModelClass.ts'

type Args = {
  context: GenerateContextType
  bodyModel: SdkModel
  renderContext: RenderContext
  destinationPath: string
}

/**
 * The inline-schema request-body shape: a nested model class (named
 * `Body`, or after the component for single-use refs) held in a
 * `body` member, with every field flattened onto the Params class as
 * delegating accessors and setters.
 */
export class ModelBody extends KtSnippet {
  bodyModel: SdkModel
  constructorLeadLines: string[]
  constructorTailLines: string[] = []
  accessorSections: Stringable[]
  builderLeadVariables: string[]
  builderTailVariables: string[] = []
  setterSections: Stringable[]
  tailSetterSections: Stringable[] = []
  buildLeadArguments = ['body.build(),']
  buildTailArguments: string[] = []
  bodyMethodSections: string[]
  nestedSections: Stringable[]
  equalsLeadNames = ['body']
  equalsTailNames: string[] = []
  hasRequired: boolean
  fenceFields: string[]

  constructor({ context, bodyModel, renderContext, destinationPath }: Args) {
    super({ context })
    this.bodyModel = bodyModel

    const { className, fields } = bodyModel

    this.constructorLeadLines = [`private val body: ${className},`]
    this.builderLeadVariables = [
      `private var body: ${className}.Builder = ${className}.builder()`
    ]
    this.bodyMethodSections = [`fun _body(): ${className} = body`]
    this.hasRequired = fields.some(field => field.required)
    this.fenceFields = fields.filter(field => field.fenceRequired).map(field => field.kotlinName)

    // Grouped like the model sections: every typed accessor, then
    // every raw accessor (corpus: TransactionSimulateClearingParams).
    this.accessorSections = [
      ...fields.map(field => flattenedTypedAccessor(field, renderContext)),
      ...fields.map(field => flattenedRawAccessor(field)),
      'fun _additionalBodyProperties(): Map<String, JsonValue> = body._additionalProperties()'
    ]

    this.setterSections = [...flattenedSetters(bodyModel), delegatedBodyPropertiesBlock]

    this.nestedSections = [
      new NestedModelClass({ context, model: bodyModel, renderContext, destinationPath })
    ]

    this.register({
      imports: {
        [`${renderContext.basePackage}.core`]: ['JsonField', 'JsonValue']
      },
      destinationPath
    })
  }

  fromLeadAssignments(fromParameter: string): string[] {
    return [`body = ${fromParameter}.body.toBuilder()`]
  }

  fromTailAssignments(_fromParameter: string): string[] {
    return []
  }

  override toString(): string {
    return ''
  }
}

const flattenedTypedAccessor = (field: SdkField, renderContext: RenderContext): string => {
  const typeExpression = toTypeExpression(field.type)
  const lines = field.description ? [field.description, ''] : []
  lines.push(field.docRequired ? requiredThrows(renderContext) : optionalThrows(renderContext))

  const accessor =
    field.required && !field.nullable
      ? `fun ${field.kotlinName}(): ${typeExpression} = body.${field.kotlinName}()`
      : `fun ${field.kotlinName}(): ${typeExpression}? = body.${field.kotlinName}()`

  return `${kdoc(lines)}\n${accessor}`
}

const flattenedRawAccessor = (field: SdkField): string => {
  const typeExpression = toTypeExpression(field.type)

  return (
    kdoc([
      `Returns the raw JSON value of [${field.kotlinName}].`,
      '',
      `Unlike [${field.kotlinName}], this method doesn't throw if the JSON field has an unexpected type.`
    ]) + `\nfun _${field.kotlinName}(): JsonField<${typeExpression}> = body._${field.kotlinName}()`
  )
}

/** The entire-body setter + per-field delegating setter family. */
const flattenedSetters = (bodyModel: SdkModel): string[] => {
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

/** The model shape's additionalBodyProperties ops — delegating into the Body builder. */
const delegatedBodyPropertiesBlock = `fun additionalBodyProperties(additionalBodyProperties: Map<String, JsonValue>) = apply {
    body.additionalProperties(additionalBodyProperties)
}

fun putAdditionalBodyProperty(key: String, value: JsonValue) = apply {
    body.putAdditionalProperty(key, value)
}

fun putAllAdditionalBodyProperties(additionalBodyProperties: Map<String, JsonValue>) =
    apply {
        body.putAllAdditionalProperties(additionalBodyProperties)
    }

fun removeAdditionalBodyProperty(key: String) = apply { body.removeAdditionalProperty(key) }

fun removeAllAdditionalBodyProperties(keys: Set<String>) = apply {
    body.removeAllAdditionalProperties(keys)
}`
