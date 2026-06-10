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

type KtDataClassValueArgs = {
  context: GenerateContextType
  objectSchema: OasObject
  destinationPath: string
  /** The generated class's name — the prefix for synthesized nested-class names. */
  className: string
  rootRef?: RefName
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
  parameterList: KtParameterList

  constructor({ context, objectSchema, destinationPath, className, rootRef }: KtDataClassValueArgs) {
    super({ context, stackTrail: objectSchema.stackTrail.clone() })

    const { properties, required = [] } = objectSchema

    if (!properties || Object.keys(properties).length === 0) {
      // `data class` requires at least one constructor parameter; the
      // dispatch routes empty objects to a `JsonObject` typealias before
      // ever reaching this class.
      throw new Error(
        `@skmtc/gen-kotlin: '${className}' has no properties — a Kotlin data class needs at least one`
      )
    }

    this.register({
      imports: { 'kotlinx.serialization': ['Serializable'] },
      destinationPath
    })

    const parameters: KtParameterArgs[] = Object.entries(properties).map(([key, property]) => {
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
