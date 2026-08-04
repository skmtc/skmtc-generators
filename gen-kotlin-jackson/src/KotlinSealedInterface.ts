import { KtAnnotation, KtSnippet } from '@skmtc/lang-kotlin'
import type {
  GenerateContextType,
  GeneratorKey,
  OasUnion,
  RefName,
  TypeSystemValue,
} from '@skmtc/core'
import { toKotlinValue } from './Kotlin.ts'
import { JACKSON_ANNOTATION_PACKAGE } from './lib.ts'
import { toMemberTag } from './sealedMembership.ts'

type KotlinSealedInterfaceArgs = {
  context: GenerateContextType
  destinationPath: string
  unionSchema: OasUnion
  generatorKey: GeneratorKey
  rootRef?: RefName
}

/**
 * One `@JsonSubTypes` entry. Holds the walked member ref SNIPPET — never
 * its rendered string — so the member's name stays in the value chain
 * and its model construction/import stitching ride along.
 */
class KotlinSubType {
  member: TypeSystemValue
  tag: string

  constructor(member: TypeSystemValue, tag: string) {
    this.member = member
    this.tag = tag
  }

  toString(): string {
    return `JsonSubTypes.Type(value = ${this.member}::class, name = "${this.tag}")`
  }
}

/**
 * The (empty) body of a generated `sealed interface` plus its class-level
 * annotations — `KtDefinition`'s bodyless idiom renders the bare
 * declaration when this value renders nothing after the head.
 *
 * Carries the polymorphic wiring via the `KtAnnotated` protocol:
 * `@JsonTypeInfo(use = NAME, include = PROPERTY, property = "<tag>")`
 * plus `@JsonSubTypes(Type(value = Dog::class, name = "dog"), …)`.
 * With `As.PROPERTY` Jackson consumes the discriminator during
 * deserialization and writes it during serialization, which is why the
 * member data classes OMIT the property (see `sealedMembership.ts`).
 *
 * Members are walked through the router so every `$ref` gets its model
 * built (or cache-hit) and its import registered — same-package imports
 * are then dropped centrally by `KtFile`.
 *
 * The retired gen-kotlin-kotlinx `KtSealedInterfaceValue` is the direct
 * ancestor; this is its Jackson flavor on the current lang-kotlin API.
 */
export class KotlinSealedInterface extends KtSnippet {
  annotations: KtAnnotation[]
  subTypes: KotlinSubType[]
  /** The `KtDocumented` protocol input — rendered as class-level KDoc. */
  description: string | undefined

  constructor(
    { context, generatorKey, destinationPath, unionSchema, rootRef }:
      KotlinSealedInterfaceArgs,
  ) {
    super({ context, generatorKey, stackTrail: unionSchema.stackTrail.clone() })

    this.description = unionSchema.description

    const { discriminator, members } = unionSchema

    if (!discriminator) {
      throw new Error(
        'a sealed interface value requires a discriminated union — only the shape dispatch routes here',
      )
    }

    const mapping = discriminator.mapping ?? {}

    this.subTypes = members.map((member) => {
      if (!member.isRef()) {
        throw new Error(
          'a sealed union member must be a $ref — the qualifying predicate guarantees it',
        )
      }

      const value = toKotlinValue({
        schema: member,
        required: true,
        destinationPath,
        context,
        rootRef,
      })

      return new KotlinSubType(value, toMemberTag(member.toRefName(), mapping))
    })

    this.annotations = [
      new KtAnnotation({
        context,
        destinationPath,
        name: 'JsonTypeInfo',
        packageName: JACKSON_ANNOTATION_PACKAGE,
        args: [
          'use = JsonTypeInfo.Id.NAME',
          'include = JsonTypeInfo.As.PROPERTY',
          `property = "${discriminator.propertyName}"`,
        ],
      }),
      new KtAnnotation({
        context,
        destinationPath,
        name: 'JsonSubTypes',
        packageName: JACKSON_ANNOTATION_PACKAGE,
        args: this.subTypes,
      }),
    ]
  }

  override toString(): string {
    // The bodyless idiom: annotations render above the head via the
    // KtAnnotated protocol; nothing renders after `sealed interface Name`.
    return ''
  }
}
