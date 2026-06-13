import type { GenerateContextType, OasObject, Stringable } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import invariant from 'tiny-invariant'
import { getModelConfig } from '@/modelConfig.ts'
import type { SharedHashes } from '@/model/structuralHash.ts'
import type { AddField } from '@/model/ModelField.ts'
import { KnownValueEnum } from '@/model/sections/KnownValueEnum.ts'
import { NestedModelClass } from '@/model/sections/NestedModelClass.ts'

const toCoreModuleRoot = (): string => {
  const { artifactName, basePackage } = getModelConfig()
  return `${artifactName}-core/src/main/kotlin/${basePackage.split('.').join('/')}`
}

/**
 * The Kotlin type contract. NOT a union consumers match on — all
 * shape variation is resolved when the `toKtType` router constructs a
 * producer; after that, consumers interpolate `${type}` and read the
 * uniform members. No `instanceof` downstream.
 */
export type KtType = {
  /** A type whose values carry their own `validate()`. */
  validatable: boolean
  /** Class sections this type contributes to the enclosing class body. */
  nestedSections: Stringable[]
  /** Class names this type brings into the enclosing scope (stdlib shadowing). */
  nestedClassNames: string[]
  /** The stdlib-shadowing pass — list types qualify themselves, nested classes recurse. */
  applyShadowing(scope: Set<string>): void
  toString(): string
}

export type KtScalar = 'Boolean' | 'Long' | 'Int' | 'Double' | 'Float' | 'String'

type KtScalarTypeArgs = {
  context: GenerateContextType
  kotlin: KtScalar
}

/** A JVM scalar (`integer`+`int32`→`Int`, else `Long`; `number`+`float`→`Float`, else `Double` — corpus mapping). */
export class KtScalarType extends KtSnippet {
  kotlin: KtScalar
  validatable = false
  nestedSections: Stringable[] = []
  nestedClassNames: string[] = []

  constructor({ context, kotlin }: KtScalarTypeArgs) {
    super({ context })
    this.kotlin = kotlin
  }

  applyShadowing(_scope: Set<string>): void {}

  override toString(): string {
    return this.kotlin
  }
}

type KtDatetimeTypeArgs = {
  context: GenerateContextType
  date: 'offset-date-time' | 'local-date'
  destinationPath: string
}

/** `format: date` → `LocalDate`; `format: date-time` → `OffsetDateTime`. Registers its own `java.time` import. */
export class KtDatetimeType extends KtSnippet {
  date: 'offset-date-time' | 'local-date'
  validatable = false
  nestedSections: Stringable[] = []
  nestedClassNames: string[] = []

  constructor({ context, date, destinationPath }: KtDatetimeTypeArgs) {
    super({ context })
    this.date = date

    this.register({
      imports: { 'java.time': [date === 'local-date' ? 'LocalDate' : 'OffsetDateTime'] },
      destinationPath
    })
  }

  applyShadowing(_scope: Set<string>): void {}

  override toString(): string {
    return this.date === 'local-date' ? 'LocalDate' : 'OffsetDateTime'
  }
}

type KtListTypeArgs = {
  context: GenerateContextType
  element: KtType
}

/** `List<T>` — `kotlin.collections.List` when a sibling nested class named `List` shadows the stdlib type. */
export class KtListType extends KtSnippet {
  element: KtType
  qualified = false
  validatable = false
  nestedSections: Stringable[]
  nestedClassNames: string[]

  constructor({ context, element }: KtListTypeArgs) {
    super({ context })
    this.element = element
    this.nestedSections = element.nestedSections
    this.nestedClassNames = element.nestedClassNames
  }

  applyShadowing(scope: Set<string>): void {
    this.qualified = scope.has('List')
    this.element.applyShadowing(scope)
  }

  override toString(): string {
    return `${this.qualified ? 'kotlin.collections.List' : 'List'}<${this.element}>`
  }
}

type KtNestedClassTypeArgs = {
  context: GenerateContextType
  className: string
  schema: OasObject
  destinationPath: string
  sharedHashes: SharedHashes
  addFields?: AddField[]
}

/** A nested inline-schema class — renders its class name; owns the nested class section. */
export class KtNestedClassType extends KtSnippet {
  className: string
  nestedClass: NestedModelClass
  validatable = true
  nestedSections: Stringable[]
  nestedClassNames: string[]

  constructor({
    context,
    className,
    schema,
    destinationPath,
    sharedHashes,
    addFields
  }: KtNestedClassTypeArgs) {
    super({ context })
    this.className = className
    this.nestedClass = new NestedModelClass({
      context,
      className,
      schema,
      destinationPath,
      sharedHashes,
      extraFields: addFields
    })
    this.nestedSections = [this.nestedClass]
    this.nestedClassNames = [className]
  }

  applyShadowing(scope: Set<string>): void {
    this.nestedClass.applyShadowing(scope)
  }

  override toString(): string {
    return this.className
  }
}

type KtEnumTypeArgs = {
  context: GenerateContextType
  className: string
  members: string[]
  description?: string
  destinationPath: string
  /** Params-context enums document `validate()` with the full KDoc block; model-context enums render it bare. */
  documentedValidate?: boolean
}

/** A Known/Value enum class — renders its class name; owns the enum class section. */
export class KtEnumType extends KtSnippet {
  className: string
  validatable = true
  nestedSections: Stringable[]
  nestedClassNames: string[]

  constructor({
    context,
    className,
    members,
    description,
    destinationPath,
    documentedValidate
  }: KtEnumTypeArgs) {
    super({ context })
    this.className = className
    this.nestedSections = [
      new KnownValueEnum({ context, className, members, description, destinationPath, documentedValidate })
    ]
    this.nestedClassNames = [className]
  }

  applyShadowing(_scope: Set<string>): void {}

  override toString(): string {
    return this.className
  }
}

type KtSharedRefTypeArgs = {
  context: GenerateContextType
  className: string
  destinationPath: string
}

/**
 * A reference to a config-asserted shared model — built from the
 * Definition `ensureSharedModels` registered, so the rendered name
 * cannot drift from it; owns the cross-file import.
 */
export class KtSharedRefType extends KtSnippet {
  name: string
  validatable = true
  nestedSections: Stringable[] = []
  nestedClassNames: string[] = []

  constructor({ context, className, destinationPath }: KtSharedRefTypeArgs) {
    super({ context })

    const config = getModelConfig()

    const definition = context.findDefinition({
      name: className,
      exportPath: `${toCoreModuleRoot()}/models/${className}.kt`
    })

    invariant(
      definition,
      `@skmtc/gen-kotlin-sdk: shared model '${className}' is not registered`
    )

    this.name = definition.identifier.name

    this.register({
      imports: { [`${config.basePackage}.models`]: [this.name] },
      destinationPath
    })
  }

  applyShadowing(_scope: Set<string>): void {}

  override toString(): string {
    return this.name
  }
}
