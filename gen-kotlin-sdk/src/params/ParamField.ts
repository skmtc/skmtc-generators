import type { GenerateContextType } from '@skmtc/core'
import { capitalize } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { toSdkConfig } from '@/config.ts'
import { kdoc } from '@/format.ts'
import { toSingular } from '@/naming.ts'
import { addMethodKdoc, KtListType, KtScalarType, type KtType } from '@skmtc/gen-kotlin-jackson-s'

/**
 * How a parameter value becomes a wire string in `_headers()` /
 * `_queryParams()` puts and `_pathParam()` segments — a param-protocol
 * decision (not a property of the Kotlin type), decided once by the
 * `toParamField` router and stored as a field:
 *
 * - `string`: a `String` scalar — rendered raw.
 * - `boxed-scalar`: any other scalar — `.toString()`, plus the boxed
 *   primitive-alias setter overload.
 * - `offset-datetime`: ISO-formatted in puts, `.toString()` in paths.
 * - `other`: enums and `LocalDate` — `.toString()`.
 */
export type WireForm = 'string' | 'boxed-scalar' | 'offset-datetime' | 'other'

export type ParamFieldArgs = {
  context: GenerateContextType
  kotlinName: string
  wireName: string
  location: 'path' | 'query' | 'header'
  type: KtType
  required: boolean
  description: string | undefined
  wireForm: WireForm
  destinationPath: string
}

/**
 * One operation parameter — the producer IS the model: the
 * `toParamField` router derives the Kotlin name, requiredness, and
 * wire form once; the field owns every per-section rendering. List
 * variation lives in the `ListParamField` subclass, chosen once by the
 * router — no consumer tests the type's shape.
 */
export class ParamField extends KtSnippet {
  kotlinName: string
  wireName: string
  location: 'path' | 'query' | 'header'
  type: KtType
  required: boolean
  description: string | undefined
  wireForm: WireForm

  constructor(args: ParamFieldArgs) {
    super({ context: args.context })

    const config = toSdkConfig(args.context)

    this.kotlinName = args.kotlinName
    this.wireName = args.wireName
    this.location = args.location
    this.type = args.type
    this.required = args.required
    this.description = args.description
    this.wireForm = args.wireForm

    if (this.required) {
      this.register({
        imports: { [`${config.basePackage}.core`]: ['checkRequired'] },
        destinationPath: args.destinationPath
      })
    }

    // The ISO formatter is used only by the put rendering, so only
    // header/query offset-datetimes need it (path segments use
    // `toString`).
    if (this.wireForm === 'offset-datetime' && this.location !== 'path') {
      this.register({
        imports: { 'java.time.format': ['DateTimeFormatter'] },
        destinationPath: args.destinationPath
      })
    }
  }

  /** `private val x: T?,` — the private-constructor parameter line. */
  constructorParameter(): string {
    return `private val ${this.kotlinName}: ${this.type}${this.optionalMark()},`
  }

  /** `fun x(): T? = x` — the accessor, with the parameter-description KDoc. */
  accessor(): string {
    return `${this.descriptionKdoc()}fun ${this.kotlinName}(): ${this.type}${this.optionalMark()} = ${this.kotlinName}`
  }

  /** The Builder's backing variable. */
  builderVariable(): string {
    return `private var ${this.kotlinName}: ${this.type}? = null`
  }

  /** The `from()` assignment. */
  fromAssignment(fromParameter: string): string {
    return `${this.kotlinName} = ${fromParameter}.${this.kotlinName}`
  }

  /** The Builder setter family. */
  setterBlocks(): string[] {
    const { kotlinName, type } = this

    if (this.required) {
      return [
        `${this.descriptionKdoc()}fun ${kotlinName}(${kotlinName}: ${type}) = apply { this.${kotlinName} = ${kotlinName} }`
      ]
    }

    const blocks = [
      `${this.descriptionKdoc()}fun ${kotlinName}(${kotlinName}: ${type}?) = apply { this.${kotlinName} = ${kotlinName} }`
    ]

    // Non-`String` scalars get the unboxed-primitive alias overload.
    if (this.wireForm === 'boxed-scalar') {
      blocks.push(
        `${kdoc([
          `Alias for [Builder.${kotlinName}].`,
          '',
          'This unboxed primitive overload exists for backwards compatibility.'
        ])}
fun ${kotlinName}(${kotlinName}: ${type}) = ${kotlinName}(${kotlinName} as ${type}?)`
      )
    }

    return blocks
  }

  /** The `build()` argument. */
  buildArgument(): string {
    return this.required
      ? `checkRequired("${this.kotlinName}", ${this.kotlinName}),`
      : `${this.kotlinName},`
  }

  /** The `_headers()` / `_queryParams()` put line. */
  put(): string {
    return this.required
      ? `put("${this.wireName}", ${this.stringify(this.kotlinName)})`
      : `${this.kotlinName}?.let { put("${this.wireName}", ${this.stringify('it')}) }`
  }

  /** The `_pathParam(index)` when-arm for a path parameter. */
  pathSegment(index: number): string {
    const value =
      this.wireForm === 'string'
        ? `${this.kotlinName}${this.required ? '' : ' ?: ""'}`
        : this.required
          ? `${this.kotlinName}.toString()`
          : `${this.kotlinName}?.toString() ?: ""`

    return `${index} -> ${value}`
  }

  /** How a put reference (`x` or `it`) becomes a wire string. */
  protected stringify(reference: string): string {
    switch (this.wireForm) {
      case 'offset-datetime':
        return `DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(${reference})`
      case 'string':
        return reference
      case 'boxed-scalar':
      case 'other':
        return `${reference}.toString()`
      default: {
        const _exhaustive: never = this.wireForm
        throw new Error(`@skmtc/gen-kotlin-sdk: unhandled WireForm '${_exhaustive}'`)
      }
    }
  }

  protected optionalMark(): string {
    return this.required ? '' : '?'
  }

  protected descriptionKdoc(): string {
    return this.description ? `${kdoc([this.description])}\n` : ''
  }

  override toString(): string {
    return this.kotlinName
  }
}

type ListParamFieldArgs = Omit<ParamFieldArgs, 'type'> & { type: KtListType }

/** The list-parameter variant — chosen once by `toParamField`; owns every list-specific rendering. */
export class ListParamField extends ParamField {
  listType: KtListType

  constructor(args: ListParamFieldArgs) {
    super(args)

    const config = toSdkConfig(args.context)

    this.listType = args.type

    this.register({
      imports: { [`${config.basePackage}.core`]: ['toImmutable'] },
      destinationPath: args.destinationPath
    })
  }

  override builderVariable(): string {
    return `private var ${this.kotlinName}: MutableList<${this.listType.element}>? = null`
  }

  override fromAssignment(fromParameter: string): string {
    return `${this.kotlinName} = ${fromParameter}.${this.kotlinName}${this.optionalMark()}.toMutableList()`
  }

  override setterBlocks(): string[] {
    const { kotlinName, type } = this
    const elementType = `${this.listType.element}`
    const elementName = toSingular(kotlinName)
    const addName = `add${capitalize(elementName)}`
    const nullable = this.optionalMark()

    return [
      `${this.descriptionKdoc()}fun ${kotlinName}(${kotlinName}: ${type}${nullable}) = apply {
    this.${kotlinName} = ${kotlinName}${nullable}.toMutableList()
}`,
      `${addMethodKdoc(elementType, kotlinName)}
fun ${addName}(${elementName}: ${elementType}) = apply {
    ${kotlinName} = (${kotlinName} ?: mutableListOf()).apply { add(${elementName}) }
}`
    ]
  }

  override buildArgument(): string {
    return this.required
      ? `checkRequired("${this.kotlinName}", ${this.kotlinName}).toImmutable(),`
      : `${this.kotlinName}?.toImmutable(),`
  }

  /** Comma-joined; non-`String` elements stringify per element. */
  protected override stringify(reference: string): string {
    const isStringElement =
      this.listType.element instanceof KtScalarType && this.listType.element.kotlin === 'String'

    return isStringElement
      ? `${reference}.joinToString(",")`
      : `${reference}.joinToString(",") { it.toString() }`
  }
}
