import { createSealedInterface, defineAndRegister, KtAnnotation, KtSnippet } from '@skmtc/lang-kotlin'
import type {
  GenerateContextType,
  GeneratorKey,
  OasUnion,
  RefName,
  StackTrail,
  TypeSystemValue,
} from '@skmtc/core'
import { toKotlinValue } from './Kotlin.ts'
import { JACKSON_ANNOTATION_PACKAGE, toModelExportPath } from './lib.ts'
import { toMemberTag } from './sealedMembership.ts'
import { toSynthesizedName } from './toSynthesizedName.ts'
import { claimSynthesizedName } from './synthesizedNames.ts'

type KotlinSealedInterfaceArgs = {
  context: GenerateContextType
  destinationPath: string
  unionSchema: OasUnion
  generatorKey: GeneratorKey
  rootRef?: RefName
}

type EnsureSealedParentArgs = {
  generatorKey: GeneratorKey
  unionSchema: OasUnion
  rootRef?: RefName
}

/**
 * Declare an INLINE qualifying union's sealed interface exactly once and
 * return its name. Two kinds of consumer race to need it — the union's
 * own render site (`KotlinUnion`, type position) and each MEMBER's
 * data-class projection (the ` : Parent` clause) — and construction
 * order between them is arbitrary, so ownership goes to whoever arrives
 * FIRST, arbitrated by the claim registry (a same-position re-claim is
 * `'reuse'`; collisions throw there).
 *
 * PLACEMENT is the models package, never the caller's file: Kotlin
 * requires sealed subtypes in the parent's package, and the members are
 * component models in `BASE_PACKAGE` — so the parent joins them, and
 * callers reference it through a registered import (same-package
 * suppression drops it where redundant). The name derives from the union
 * node's own stackTrail — the SAME derivation the membership scan used
 * when it claimed the members, so the clause and the reference cannot
 * disagree.
 */
export const ensureSealedParent = (
  context: GenerateContextType,
  { generatorKey, unionSchema, rootRef }: EnsureSealedParentArgs,
): string => {
  const name = toSynthesizedName(context, unionSchema.stackTrail)

  const claim = claimSynthesizedName(context, {
    name,
    stackTrail: unionSchema.stackTrail,
  })

  if (claim === 'declare') {
    const sealedPath = toModelExportPath(context, name)

    defineAndRegister(context, {
      identifier: createSealedInterface(name),
      value: new KotlinSealedInterface({
        context,
        generatorKey,
        destinationPath: sealedPath,
        unionSchema,
        rootRef,
      }),
      destinationPath: sealedPath,
    })
  }

  return name
}

type KotlinSubTypeArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  stackTrail: StackTrail
  member: TypeSystemValue
  tag: string
}

/**
 * One `@JsonSubTypes` entry. Holds the walked member ref SNIPPET — never
 * its rendered string — so the member's name stays in the value chain
 * and its model construction/import stitching ride along. A `KtSnippet`
 * (not a plain Stringable) so the entry's span carries the member ref's
 * stackTrail like every other node in the tree.
 */
class KotlinSubType extends KtSnippet {
  member: TypeSystemValue
  tag: string

  constructor({ context, generatorKey, stackTrail, member, tag }: KotlinSubTypeArgs) {
    super({ context, generatorKey, stackTrail })

    this.member = member
    this.tag = tag
  }

  override toString(): string {
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

  constructor(
    { context, generatorKey, destinationPath, unionSchema, rootRef }:
      KotlinSealedInterfaceArgs,
  ) {
    super({ context, generatorKey, stackTrail: unionSchema.stackTrail.clone() })

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

      return new KotlinSubType({
        context,
        generatorKey,
        stackTrail: member.stackTrail.clone(),
        member: value,
        tag: toMemberTag(member.toRefName(), mapping),
      })
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
