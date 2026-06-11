import { capitalize, camelCase } from '@skmtc/core'
import type { GenerateContextType, OasObject, RefName } from '@skmtc/core'
import {
  CsAttribute,
  CsPropertyList,
  CsSnippet,
  sanitizePropertyName,
  type CsPropertyArgs
} from '@skmtc/lang-csharp'
import { toCsValue } from './Cs.ts'
import { toCsModelName } from './base.ts'
import type { PolymorphicParent } from './polymorphicMembership.ts'

type CsRecordValueArgs = {
  context: GenerateContextType
  objectSchema: OasObject
  destinationPath: string
  /** The generated record's name — the prefix for synthesized nested-type names AND the CS0542 collision check. */
  className: string
  rootRef?: RefName
  inliningTrail?: RefName[]
  /** The polymorphic parents claiming this record (CS-B) — drives the
   * `CsBased` clause and the discriminator-property omission.
   * Empty/absent for non-members and for synthesized inline types
   * (inline schemas have no refName for the membership inversion). */
  polymorphicParents?: PolymorphicParent[]
}

/**
 * The property members of a generated `record` — the value a
 * `CsDefinition` wraps in the `public sealed partial record Name { … }`
 * shell (D3: nominal, statement-shaped properties).
 *
 * Per property:
 * - name = `sanitizePropertyName(PascalCase(wireName))`; when that
 *   collides with the enclosing type's name (CS0542: a member may not
 *   share its enclosing type's name) it takes the deterministic
 *   `<Name>Value` rename (D11) — the wire name survives via the
 *   attribute either way.
 * - `[JsonPropertyName("wire_name")]` whenever the (unescaped) property
 *   name differs from the wire name — nearly always, since PascalCasing
 *   is itself a rename; explicit beats coupling to the consumer's
 *   `PropertyNamingPolicy` (D11).
 * - spec-required → the `required` modifier (D4; missing-on-deserialize
 *   throws — scratch-proof 1).
 * - optional → `[JsonIgnore(Condition = WhenWritingNull)]` (A1: null
 *   serializes as ABSENT; a required-nullable property writes
 *   `"x": null`). The type's `?` comes from the value's own modifiers —
 *   single `?` owner.
 *
 * When the schema ALSO declares `additionalProperties`, the record
 * carries a `[JsonExtensionData] AdditionalProperties` member (D16 —
 * unknown fields round-trip; scratch-proof 9).
 *
 * The schema `description` rides the `CsDocumented` protocol (XML
 * escaping is the lang's `withDescription` job — note-30 lesson 3).
 *
 * The serialization flavor seam: a Newtonsoft sibling generator replaces
 * the attribute construction in this file (and `CsEnumMembers`) only.
 */
export class CsRecordValue extends CsSnippet {
  /** The `CsDocumented` protocol input — rendered by `CsDefinition` as an XML-doc summary. */
  description: string | undefined
  /** The `CsBased` protocol input — the claiming polymorphic parents'
   * names, rendered by `CsDefinition` as ` : Animal` (CS-B). */
  baseTypes: string[]
  propertyList: CsPropertyList

  constructor({
    context,
    objectSchema,
    destinationPath,
    className,
    rootRef,
    inliningTrail,
    polymorphicParents = []
  }: CsRecordValueArgs) {
    super({ context, stackTrail: objectSchema.stackTrail.clone() })

    this.description = objectSchema.description

    if (polymorphicParents.length > 1) {
      // Kotlin's sealed INTERFACES admit multi-parent membership; a C#
      // record derives from ONE base record (interfaces-only multiple
      // inheritance, and D14 chose abstract records). Unrepresentable
      // input fails the item loudly, never a silently-dropped parent.
      const parentNames = polymorphicParents
        .map(parent => toCsModelName(parent.parentRefName))
        .join(', ')

      throw new Error(
        `@skmtc/gen-csharp: '${className}' is claimed by multiple polymorphic parents ` +
          `(${parentNames}) — a C# record derives from ONE base record; restructure the schema`
      )
    }

    this.baseTypes = polymorphicParents.map(parent => toCsModelName(parent.parentRefName))

    const { properties, required = [], additionalProperties } = objectSchema

    // The parent's [JsonDerivedType] tag carries the discriminator;
    // a member property may not collide with it (scratch 6b), so
    // members OMIT each claiming parent's discriminator property.
    const omittedProperties = new Set(
      polymorphicParents.map(parent => parent.discriminatorPropertyName)
    )

    const propertyEntries = Object.entries(properties ?? {}).filter(
      ([key]) => !omittedProperties.has(key)
    )

    if (propertyEntries.length === 0 && polymorphicParents.length === 0) {
      // The dispatch routes property-less objects to the dictionary /
      // JsonObject forms before ever reaching this class. A MEMBER
      // left empty after discriminator omission is legal C# — it
      // renders the bodyless `record X : Animal;` collapse (unlike
      // Kotlin's >= 1-parameter data class).
      throw new Error(
        `@skmtc/gen-csharp: '${className}' has no properties — ` +
          `CsRecordValue is only reachable through the toCsProjection dispatch`
      )
    }

    const serializationImports = new Set<string>()

    const csProperties: CsPropertyArgs[] = propertyEntries.map(([key, property]) => {
      const isRequired = required.includes(key)

      const pascalName = sanitizePropertyName(capitalize(camelCase(key)))
      const propertyName = pascalName === className ? `${pascalName}Value` : pascalName

      const attributes: CsAttribute[] = []

      // An `@`-escaped keyword still equals its wire name with the `@`
      // stripped; anything else that differs needs the rename attribute.
      const unescaped = propertyName.replace(/^@/, '')
      if (unescaped !== key) {
        attributes.push(new CsAttribute('JsonPropertyName', [`"${key}"`]))
        serializationImports.add('JsonPropertyName')
      }

      if (!isRequired) {
        attributes.push(
          new CsAttribute('JsonIgnore', ['Condition = JsonIgnoreCondition.WhenWritingNull'])
        )
        serializationImports.add('JsonIgnore')
        serializationImports.add('JsonIgnoreCondition')
      }

      const value = toCsValue({
        schema: property,
        destinationPath,
        required: isRequired,
        context,
        rootRef,
        fallbackName: `${className}${capitalize(camelCase(key))}`,
        inliningTrail
      })

      return {
        name: propertyName,
        type: value,
        required: isRequired,
        attributes: attributes.length ? attributes : undefined
      }
    })

    if (additionalProperties) {
      // D16: properties + additionalProperties → the extension-data
      // member. STJ requires the IDictionary<string, JsonElement> shape;
      // a typed additionalProperties schema is not narrowable here
      // (documented limit — values surface as JsonElement).
      csProperties.push({
        name: 'AdditionalProperties',
        type: 'IDictionary<string, JsonElement>',
        nullable: true,
        attributes: [new CsAttribute('JsonExtensionData')]
      })
      serializationImports.add('JsonExtensionData')

      this.register({
        imports: {
          'System.Collections.Generic': ['IDictionary'],
          'System.Text.Json': ['JsonElement']
        },
        destinationPath
      })
    }

    if (serializationImports.size > 0) {
      this.register({
        imports: { 'System.Text.Json.Serialization': [...serializationImports] },
        destinationPath
      })
    }

    this.propertyList = new CsPropertyList(csProperties)
  }

  override toString(): string {
    return `${this.propertyList}`
  }
}
