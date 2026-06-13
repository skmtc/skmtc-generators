import type { GenerateContextType, OasRef, OasSchema } from '@skmtc/core'
import { camelCase, capitalize } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { getModelConfig } from '@/modelConfig.ts'
import { optionalThrows, requiredThrows } from '@/errors.ts'
import { kdoc } from '@/format.ts'
import { decapitalize, toSingular } from '@/naming.ts'
import { KtListType, KtScalarType, type KtScalar, type KtType } from '@/model/types/KtTypes.ts'

/** An enrichment `addFields` entry — config-injected fields the spec omits. */
export type AddField = { wireName: string; type: 'boolean' | 'string' | 'integer' | 'number' }

type ModelFieldArgs = {
  context: GenerateContextType
  wireName: string
  /** The resolved property schema — axes derive from it. */
  schema: OasSchema
  specRequired: boolean
  type: KtType
  destinationPath: string
}

type InjectedFieldArgs = {
  context: GenerateContextType
  /** A config-injected field (enrichment `addFields`) — no spec schema behind it. */
  addField: AddField
}

/**
 * One model field — the producer IS the model: the constructor derives
 * the Kotlin name and the four requiredness axes (note 32 KS-C
 * close-out) once; the field owns every per-section rendering. List
 * variation lives in the `ListModelField` subclass, chosen once by
 * `toModelField` — no consumer tests the type's kind.
 */
export class ModelField extends KtSnippet {
  kotlinName: string
  wireName: string
  type: KtType
  /** Construction axis: `checkRequired`, builder-var form. */
  required: boolean
  /** Wording axis (`@throws` text): required AND NOT nullable, or a `fieldStates` override. */
  docRequired: boolean
  /** Fence + ordering axis: spec-required or overridden. */
  fenceRequired: boolean
  /** Resolved-schema `nullable: true` — typed setter takes `T?` via `JsonField.ofNullable`. */
  nullable: boolean
  description: string | undefined

  constructor(args: ModelFieldArgs | InjectedFieldArgs) {
    super({ context: args.context })

    const config = getModelConfig()

    if ('addField' in args) {
      const { addField } = args
      const scalarByType: Record<AddField['type'], KtScalar> = {
        boolean: 'Boolean',
        string: 'String',
        integer: 'Long',
        number: 'Double'
      }
      const requiredNullable = config.fieldStates?.[addField.wireName] === 'required-nullable'

      this.wireName = addField.wireName
      this.kotlinName = config.kotlinNames?.[addField.wireName] ?? camelCase(addField.wireName)
      this.type = new KtScalarType({ context: args.context, kotlin: scalarByType[addField.type] })
      this.required = false
      this.docRequired = requiredNullable
      this.fenceRequired = requiredNullable
      this.nullable = false
      this.description = undefined

      return
    }

    const { wireName, schema, specRequired } = args

    // The config override only applies where the spec does NOT already
    // require the field (corpus: one site spec-requires limitExceeded
    // and renders it fully required).
    const requiredNullable =
      config.fieldStates?.[wireName] === 'required-nullable' && !specRequired

    this.wireName = wireName
    this.kotlinName = config.kotlinNames?.[wireName] ?? camelCase(wireName)
    this.type = args.type
    this.required = requiredNullable ? false : specRequired
    this.docRequired = (specRequired && schema.nullable !== true) || requiredNullable
    this.fenceRequired = specRequired || requiredNullable
    this.nullable = schema.nullable === true
    // $ref fields fall back to the referenced component's description.
    this.description = schema.description

    if (this.required) {
      this.register({
        imports: { [`${config.basePackage}.core`]: ['checkRequired'] },
        destinationPath: args.destinationPath
      })
    }
  }

  /** `fun x(): T = x.getRequired("x")` — the model-class accessor. */
  typedAccessor(): string {
    const lines = this.description ? [this.description, ''] : []
    lines.push(this.docRequired ? requiredThrows() : optionalThrows())

    const accessor =
      this.required && !this.nullable
        ? `fun ${this.kotlinName}(): ${this.type} = ${this.kotlinName}.getRequired("${this.wireName}")`
        : `fun ${this.kotlinName}(): ${this.type}? = ${this.kotlinName}.getNullable("${this.wireName}")`

    return `${kdoc(lines)}\n${accessor}`
  }

  /** `@JsonProperty(...) fun _x(): JsonField<T> = x` — the raw accessor. */
  rawAccessor(): string {
    return `${this.rawAccessorKdoc()}\n@JsonProperty("${this.wireName}") @ExcludeMissing fun _${this.kotlinName}(): JsonField<${this.type}> = ${this.kotlinName}`
  }

  /** `fun x(): T = body.x()` — the accessor flattened onto a Params class. */
  flattenedTypedAccessor(): string {
    const lines = this.description ? [this.description, ''] : []
    lines.push(this.docRequired ? requiredThrows() : optionalThrows())

    const accessor =
      this.required && !this.nullable
        ? `fun ${this.kotlinName}(): ${this.type} = body.${this.kotlinName}()`
        : `fun ${this.kotlinName}(): ${this.type}? = body.${this.kotlinName}()`

    return `${kdoc(lines)}\n${accessor}`
  }

  /** `fun _x(): JsonField<T> = body._x()` — the raw accessor flattened onto a Params class. */
  flattenedRawAccessor(): string {
    return `${this.rawAccessorKdoc()}\nfun _${this.kotlinName}(): JsonField<${this.type}> = body._${this.kotlinName}()`
  }

  /** The Builder's backing variable. */
  builderVariable(): string {
    return this.required
      ? `private var ${this.kotlinName}: JsonField<${this.type}>? = null`
      : `private var ${this.kotlinName}: JsonField<${this.type}> = JsonMissing.of()`
  }

  /** The `from()` assignment — a field named like the parameter needs `this.`. */
  fromAssignment(fromParameter: string): string {
    return `${this.fromTarget(fromParameter)} = ${fromParameter}.${this.kotlinName}`
  }

  /** The model-Builder setter family: typed + raw JSON. */
  setterBlocks(): string[] {
    const { kotlinName } = this

    return [
      `${this.descriptionKdoc()}${this.typedSetter()}`,
      `${this.rawJsonSetterKdoc()}\nfun ${kotlinName}(${kotlinName}: JsonField<${this.type}>) = apply { this.${kotlinName} = ${kotlinName} }`
    ]
  }

  /** The Params-Builder setter family delegating into the Body builder. */
  flattenedSetterBlocks(): string[] {
    const { kotlinName } = this
    const typedParameter = this.nullable ? `${this.type}?` : `${this.type}`

    return [
      `${this.descriptionKdoc()}fun ${kotlinName}(${kotlinName}: ${typedParameter}) = apply { body.${kotlinName}(${kotlinName}) }`,
      `${this.rawJsonSetterKdoc()}\nfun ${kotlinName}(${kotlinName}: JsonField<${this.type}>) = apply { body.${kotlinName}(${kotlinName}) }`
    ]
  }

  /** The `build()` argument. */
  buildArgument(): string {
    return this.required
      ? `checkRequired("${this.kotlinName}", ${this.kotlinName}),`
      : `${this.kotlinName},`
  }

  /** The `validate()` line for this field. */
  validateTerm(): string {
    const call = `${this.kotlinName}()`

    return this.type.validatable ? `${call}${this.optionalMark()}.validate()` : call
  }

  /** The `validity()` score term for this field. */
  validityTerm(): string {
    const name = this.kotlinName

    return this.type.validatable
      ? `(${name}.asKnown()?.validity() ?: 0)`
      : `(if (${name}.asKnown() == null) 0 else 1)`
  }

  protected optionalMark(): string {
    return this.required && !this.nullable ? '' : '?'
  }

  protected fromTarget(fromParameter: string): string {
    return this.kotlinName === fromParameter ? `this.${this.kotlinName}` : this.kotlinName
  }

  protected descriptionKdoc(): string {
    return this.description ? `${kdoc([this.description])}\n` : ''
  }

  protected typedSetter(): string {
    const { kotlinName } = this

    // Resolved-nullable fields take `T?` through `JsonField.ofNullable`.
    return this.nullable
      ? `fun ${kotlinName}(${kotlinName}: ${this.type}?) = ${kotlinName}(JsonField.ofNullable(${kotlinName}))`
      : `fun ${kotlinName}(${kotlinName}: ${this.type}) = ${kotlinName}(JsonField.of(${kotlinName}))`
  }

  protected rawAccessorKdoc(): string {
    return kdoc([
      `Returns the raw JSON value of [${this.kotlinName}].`,
      '',
      `Unlike [${this.kotlinName}], this method doesn't throw if the JSON field has an unexpected type.`
    ])
  }

  /**
   * The "arbitrary JSON value" setter KDoc. Doc references use the
   * UNQUALIFIED form even when the code is shadow-qualified
   * (`kotlin.collections.List`).
   */
  protected rawJsonSetterKdoc(): string {
    const docType = this.docTypeExpression()
    const wellTyped = `[${docType}]`

    return kdoc([
      `Sets [Builder.${this.kotlinName}] to an arbitrary JSON value.`,
      '',
      `You should usually call [Builder.${this.kotlinName}] with a well-typed ${wellTyped} value instead. This method is primarily for setting the field to an undocumented or not yet supported value.`
    ])
  }

  protected docTypeExpression(): string {
    return `${this.type}`
  }

  override toString(): string {
    return this.kotlinName
  }
}

type ListModelFieldArgs = Omit<ModelFieldArgs, 'type'> & { type: KtListType }

/** The list-field variant — chosen once by `toModelField`; owns every list-specific rendering. */
export class ListModelField extends ModelField {
  listType: KtListType

  constructor(args: ListModelFieldArgs) {
    super(args)
    this.listType = args.type

    const config = getModelConfig()

    this.register({
      imports: { [`${config.basePackage}.core`]: ['checkKnown', 'toImmutable'] },
      destinationPath: args.destinationPath
    })
  }

  /** Lists are ALWAYS the nullable form — the addX accumulator needs the null sentinel. */
  override builderVariable(): string {
    return `private var ${this.kotlinName}: JsonField<MutableList<${this.listType.element}>>? = null`
  }

  override fromAssignment(fromParameter: string): string {
    return `${this.fromTarget(fromParameter)} = ${fromParameter}.${this.kotlinName}.map { it.toMutableList() }`
  }

  override setterBlocks(): string[] {
    const { kotlinName } = this
    const { addName, elementName, elementType } = this.addMethod()
    // When the add parameter collides with the field name
    // (`addList(list:)` on field `list`), the field reference needs
    // `this.` in the body and the Builder-qualified KDoc link.
    const collides = elementName === kotlinName
    const fieldReference = collides ? `this.${kotlinName}` : kotlinName
    const fieldLink = collides ? `Builder.${kotlinName}` : kotlinName

    return [
      `${this.descriptionKdoc()}${this.typedSetter()}`,
      `${this.rawJsonSetterKdoc()}
fun ${kotlinName}(${kotlinName}: JsonField<${this.type}>) = apply {
    this.${kotlinName} = ${kotlinName}.map { it.toMutableList() }
}`,
      `${addMethodKdoc(elementType, fieldLink)}
fun ${addName}(${elementName}: ${elementType}) = apply {
    ${fieldReference} =
        (${fieldReference} ?: JsonField.of(mutableListOf())).also {
            checkKnown("${kotlinName}", it).add(${elementName})
        }
}`
    ]
  }

  override flattenedSetterBlocks(): string[] {
    const { addName, elementName, elementType } = this.addMethod()

    return [
      ...super.flattenedSetterBlocks(),
      `${addMethodKdoc(elementType, this.kotlinName)}\nfun ${addName}(${elementName}: ${elementType}) = apply { body.${addName}(${elementName}) }`
    ]
  }

  override buildArgument(): string {
    return this.required
      ? `checkRequired("${this.kotlinName}", ${this.kotlinName}).map { it.toImmutable() },`
      : `(${this.kotlinName} ?: JsonMissing.of()).map { it.toImmutable() },`
  }

  override validateTerm(): string {
    const call = `${this.kotlinName}()`

    return this.listType.element.validatable
      ? `${call}${this.optionalMark()}.forEach { it.validate() }`
      : call
  }

  override validityTerm(): string {
    const name = this.kotlinName

    return this.listType.element.validatable
      ? `(${name}.asKnown()?.sumOf { it.validity().toInt() } ?: 0)`
      : `(${name}.asKnown()?.size ?: 0)`
  }

  /** List setter KDoc references the unqualified backtick form. */
  protected override rawJsonSetterKdoc(): string {
    return kdoc([
      `Sets [Builder.${this.kotlinName}] to an arbitrary JSON value.`,
      '',
      `You should usually call [Builder.${this.kotlinName}] with a well-typed \`${this.docTypeExpression()}\` value instead. This method is primarily for setting the field to an undocumented or not yet supported value.`
    ])
  }

  protected override docTypeExpression(): string {
    return `List<${docTypeOf(this.listType.element)}>`
  }

  /**
   * The `addX` naming: producer-class elements name the method and
   * parameter after the class (`addAgency(agency: Agency)`); scalar
   * elements after the singularized field (`addRouteId(routeId:
   * String)`).
   */
  private addMethod(): { addName: string; elementName: string; elementType: string } {
    const elementType = `${this.listType.element}`
    const isScalarElement = this.listType.element instanceof KtScalarType
    const elementName = isScalarElement
      ? toSingular(this.kotlinName)
      : decapitalize(elementType)

    return { addName: `add${capitalize(elementName)}`, elementName, elementType }
  }
}

/** Doc references stay UNQUALIFIED at every nesting level. */
const docTypeOf = (type: KtType): string => {
  return type instanceof KtListType ? `List<${docTypeOf(type.element)}>` : `${type}`
}

/** The `addX` KDoc — shared with the params list-param setters. */
export const addMethodKdoc = (elementType: string, fieldLink: string): string => {
  return kdoc([
    `Adds a single [${elementType}] to [${fieldLink}].`,
    '',
    '@throws IllegalStateException if the field was previously set to a non-list.'
  ])
}

/** The required-fields code fence shared by the companion and `build()` KDocs. */
export const requiredFieldsFence = (fields: ModelField[]): string[] => {
  const requiredFields = fields.filter(field => field.fenceRequired)

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
