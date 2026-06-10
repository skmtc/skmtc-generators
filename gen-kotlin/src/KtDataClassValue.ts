import { capitalize, camelCase } from '@skmtc/core'
import type { GenerateContextType, OasObject, RefName } from '@skmtc/core'
import {
  KtSnippet,
  KtAnnotation,
  KtParameterList,
  sanitizePropertyName,
  type KtParameterArgs
} from '@skmtc/lang-kotlin'
import { toKtValue } from './Kt.ts'
import { toKtModelName } from './base.ts'
import type { SealedParent } from './sealedMembership.ts'

type KtDataClassValueArgs = {
  context: GenerateContextType
  objectSchema: OasObject
  destinationPath: string
  /** The generated class's name — the prefix for synthesized nested-class names. */
  className: string
  rootRef?: RefName
  /** The sealed parents claiming this class (spec 22 §2.4) — drives the
   * supertype clause, the `@SerialName` wire tag, and the
   * discriminator-property omission. Empty/absent for non-members and
   * for synthesized inline siblings (inline schemas have no refName). */
  sealedParents?: SealedParent[]
}

/**
 * The primary-constructor body of a generated `data class` — the value a
 * `KtDefinition` wraps in the `data class Name( … )` shell.
 *
 * Per property: name = `sanitizePropertyName(camelCase(wireName))`;
 * `@SerialName("wire_name")` when the (unescaped) property name differs
 * from the wire name (Kotlin cannot quote property names — the annotation
 * IS the rename mechanism); optional properties get `= null` (the type's
 * `?` comes from the value's own modifiers — single `?` owner).
 *
 * Carries the class-level `@Serializable` via the `KtAnnotated` protocol.
 * The serialization flavor seam: a Jackson sibling generator replaces the
 * annotation construction in this file (and `KtEnumEntries`) only.
 */
export class KtDataClassValue extends KtSnippet {
  annotations = [new KtAnnotation('Serializable')]
  /** The `KtSupertyped` protocol input — the claiming sealed parents'
   * class names, rendered by `KtDefinition` as ` : Animal, Pet`. */
  supertypes: string[]
  parameterList: KtParameterList

  constructor({
    context,
    objectSchema,
    destinationPath,
    className,
    rootRef,
    sealedParents = []
  }: KtDataClassValueArgs) {
    super({ context, stackTrail: objectSchema.stackTrail.clone() })

    this.supertypes = sealedParents.map(parent => toKtModelName(parent.parentRefName))

    if (sealedParents.length > 0) {
      // One @SerialName per class: every claiming parent must agree on
      // the wire tag. A wire format that names one class two ways has no
      // single right answer — fail the item loudly (spec 22 §2.4).
      const tags = [...new Set(sealedParents.map(parent => parent.tag))]
      const [tag] = tags

      if (tags.length > 1 || tag === undefined) {
        throw new Error(
          `@skmtc/gen-kotlin: '${className}' is claimed by sealed parents with conflicting ` +
            `wire tags (${tags.join(', ')}) — a Kotlin class carries one @SerialName`
        )
      }

      this.annotations.push(new KtAnnotation('SerialName', [`"${tag}"`]))
      this.register({
        imports: { 'kotlinx.serialization': ['SerialName'] },
        destinationPath
      })
    }

    const { properties, required = [] } = objectSchema

    // The kotlinx class discriminator carries the tag; a serialized
    // property may not collide with it, so members OMIT each claiming
    // parent's discriminator property (spec 22, decision 2 —
    // scratch-proved to round-trip).
    const omittedProperties = new Set(sealedParents.map(parent => parent.discriminatorPropertyName))

    const propertyEntries = Object.entries(properties ?? {}).filter(
      ([key]) => !omittedProperties.has(key)
    )

    if (propertyEntries.length === 0) {
      // `data class` requires at least one constructor parameter; the
      // dispatch routes empty objects to a `JsonObject` typealias before
      // ever reaching this class.
      throw new Error(
        `@skmtc/gen-kotlin: '${className}' has no properties` +
          `${omittedProperties.size > 0 ? ' (after discriminator-property omission)' : ''}` +
          ` — a Kotlin data class needs at least one`
      )
    }

    this.register({
      imports: { 'kotlinx.serialization': ['Serializable'] },
      destinationPath
    })

    const parameters: KtParameterArgs[] = propertyEntries.map(([key, property]) => {
      const isRequired = required.includes(key)
      const propertyName = sanitizePropertyName(camelCase(key))
      const annotations: KtAnnotation[] = []

      // A backticked keyword (`object`) still equals its wire name — no
      // rename, no annotation. Anything else that differs needs one.
      const unescaped = propertyName.replaceAll('`', '')
      if (unescaped !== key) {
        annotations.push(new KtAnnotation('SerialName', [`"${key}"`]))
        this.register({
          imports: { 'kotlinx.serialization': ['SerialName'] },
          destinationPath
        })
      }

      const value = toKtValue({
        schema: property,
        destinationPath,
        required: isRequired,
        context,
        rootRef,
        fallbackName: `${className}${capitalize(camelCase(key))}`
      })

      return {
        name: propertyName,
        type: value,
        annotations: annotations.length ? annotations : undefined,
        defaultValue: isRequired ? undefined : 'null'
      }
    })

    this.parameterList = new KtParameterList(parameters)
  }

  override toString(): string {
    return `${this.parameterList}`
  }
}
