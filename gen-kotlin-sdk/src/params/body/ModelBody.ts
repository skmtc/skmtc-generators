import type { GenerateContextType, OasObject, Stringable } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { sdkConfig as config } from '@/config.ts'
import { kdoc } from '@/format.ts'
import { NestedModelClass, type ModelField, type SharedHashes } from '@skmtc/gen-kotlin-jackson-s'

type Args = {
  context: GenerateContextType
  className: string
  schema: OasObject
  destinationPath: string
  sharedHashes: SharedHashes
}

/**
 * The inline-schema request-body shape: a nested model class (named
 * `Body`, or after the component for single-use refs) held in a
 * `body` member, with every field flattened onto the Params class as
 * delegating accessors and setters.
 */
export class ModelBody extends KtSnippet {
  className: string
  fields: ModelField[]
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

  constructor({ context, className, schema, destinationPath, sharedHashes }: Args) {
    super({ context })
    this.className = className

    const nestedClass = new NestedModelClass({
      context,
      className,
      schema,
      destinationPath,
      sharedHashes
    })
    this.fields = nestedClass.fields
    this.nestedSections = [nestedClass]

    this.constructorLeadLines = [`private val body: ${className},`]
    this.builderLeadVariables = [`private var body: ${className}.Builder = ${className}.builder()`]
    this.bodyMethodSections = [`fun _body(): ${className} = body`]
    this.hasRequired = this.fields.some(field => field.required)
    this.fenceFields = this.fields
      .filter(field => field.fenceRequired)
      .map(field => field.kotlinName)

    // Grouped like the model sections: every typed accessor, then
    // every raw accessor (corpus: TransactionSimulateClearingParams).
    this.accessorSections = [
      ...this.fields.map(field => field.flattenedTypedAccessor()),
      ...this.fields.map(field => field.flattenedRawAccessor()),
      'fun _additionalBodyProperties(): Map<String, JsonValue> = body._additionalProperties()'
    ]

    this.setterSections = [
      this.bodySetter(),
      ...this.fields.flatMap(field => field.flattenedSetterBlocks()),
      delegatedBodyPropertiesBlock
    ]

    this.register({
      imports: {
        [`${config.basePackage}.core`]: ['JsonField', 'JsonValue']
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

  /** The entire-body setter with the top-level-setter link list. */
  private bodySetter(): string {
    const links = this.fields.map(field => `- [${field.kotlinName}]`)
    // The corpus shows at most five links, appending `- etc.` from
    // five fields up (TransferCreateParams: exactly five + etc.).
    const shown = links.length >= 5 ? [...links.slice(0, 5), '- etc.'] : links

    return (
      kdoc([
        'Sets the entire request body.',
        '',
        "This is generally only useful if you are already constructing the body separately. Otherwise, it's more convenient to use the top-level setters instead:",
        ...shown
      ]) + `\nfun body(body: ${this.className}) = apply { this.body = body.toBuilder() }`
    )
  }

  override toString(): string {
    return ''
  }
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
