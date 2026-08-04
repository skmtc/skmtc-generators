import { camelCase, isEmpty } from '@skmtc/core'
import {
  createDataClass,
  defineAndRegister,
  KtAnnotation,
  KtParameterList,
  KtSnippet,
  sanitizePropertyName,
} from '@skmtc/lang-kotlin'
import { toSynthesizedName } from './toSynthesizedName.ts'
import type { KtParameterArgs } from '@skmtc/lang-kotlin'
import type {
  CustomValue,
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasObject,
  OasRef,
  OasSchema,
  RefName,
  TypeSystemValue,
} from '@skmtc/core'
import { toKotlinValue } from './Kotlin.ts'
import { applyModifiers, isNullish } from './modifiers.ts'
import { KotlinUnknown } from './KotlinScalars.ts'
import { JACKSON_ANNOTATION_PACKAGE, JSON_PROPERTY } from './lib.ts'

type KotlinObjectArgs = {
  context: GenerateContextType
  destinationPath: string
  objectSchema: OasObject
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

/**
 * An object reached as a VALUE — an inline nested object, not a top-level
 * model. Kotlin has no anonymous class literal, so an inline object WITH
 * properties is synthesized as a named sibling `data class` in the
 * destination file and referenced by name (the retired gen-kotlin-kotlinx
 * pattern; the name derives from the schema's own `stackTrail`, so every
 * construction path — including peers arriving through
 * `insertNormalizedModel`'s contract — lands on the same name). A
 * record-only object renders `Map<String, T>`; an empty object renders
 * `Map<String, Any?>` (an unconstrained schema means "any object" — the
 * map IS its type, not a fallback). A top-level object model never
 * reaches this class — `KotlinProjection` builds its declaration
 * directly (see shape.ts).
 */
export class KotlinObject extends KtSnippet {
  type = 'object' as const
  objectProperties: KotlinObjectProperties | null
  recordProperties: KotlinRecord | null
  modifiers: Modifiers
  /** The synthesized sibling's name, when properties forced a declaration. */
  private reference: string | null = null

  constructor(
    {
      context,
      generatorKey,
      destinationPath,
      objectSchema,
      modifiers,
      rootRef,
    }: KotlinObjectArgs,
  ) {
    super({
      context,
      generatorKey,
      stackTrail: objectSchema.stackTrail.clone(),
    })

    this.modifiers = modifiers

    const { properties, required, additionalProperties } = objectSchema

    const hasProperties = properties && !isEmpty(properties)

    this.recordProperties = additionalProperties
      ? new KotlinRecord({
        context,
        generatorKey,
        destinationPath,
        schema: additionalProperties,
        rootRef,
      })
      : null

    this.objectProperties = hasProperties
      ? new KotlinObjectProperties({
        context,
        generatorKey,
        destinationPath,
        properties,
        // 'required' lists which PROPERTIES are required — it is not
        // about the object itself. Each property's optionality renders at
        // that property's own leaf via its modifiers.
        required,
        rootRef,
        additionalPropertiesRecord: this.recordProperties ?? undefined,
      })
      : null

    if (this.objectProperties) {
      const name = toSynthesizedName(objectSchema.stackTrail)

      const existing = context.findDefinition({
        name,
        exportPath: destinationPath,
      })

      if (!existing) {
        defineAndRegister(context, {
          identifier: createDataClass(name),
          value: this.objectProperties,
          destinationPath,
        })
      }

      this.reference = name
    }
  }

  override toString(): string {
    const { reference, recordProperties } = this

    // SLOT(object-intersection): when properties and additionalProperties
    // coexist, the synthesized class carries BOTH channels — the declared
    // parameters plus a `@JsonAnySetter`/`@JsonAnyGetter` catch-all map —
    // so the reference covers the whole schema.
    // SLOT(object-empty): an unconstrained object schema means "any
    // object" — `Map<String, Any?>` is its honest type.
    return applyModifiers(
      reference ?? recordProperties?.toString() ?? 'Map<String, Any?>',
      this.modifiers,
    )
  }
}

type Visibility = {
  readOnly: boolean
  writeOnly: boolean
}

type KotlinObjectPropertiesArgs = {
  context: GenerateContextType
  destinationPath: string
  properties: Record<string, OasSchema | OasRef<'schema'> | CustomValue>
  required: OasObject['required']
  generatorKey: GeneratorKey
  rootRef?: RefName
  /**
   * The object's `additionalProperties` channel, when it coexists with
   * declared properties — renders as a `@JsonAnySetter`/`@JsonAnyGetter`
   * catch-all map parameter appended to the primary constructor, so the
   * mixed form loses neither channel.
   */
  additionalPropertiesRecord?: KotlinRecord
  /**
   * The claiming sealed parents' class names — renders as the inline
   * ` : Pet` clause after the parameter list (`KtDefinition`'s value
   * renders everything after the head). Same package by the export-path
   * policy, so no import is involved — which is also what satisfies
   * Kotlin's sealed rule (subtypes live in the parent's package).
   */
  supertypes?: string[]
  /**
   * Wire keys to drop from the parameter list — each claiming parent's
   * `discriminator.propertyName`. The `@JsonTypeInfo` class discriminator
   * carries the tag; a declared property would collide with it. Filtered
   * BEFORE the property walk so the discriminator's schema (typically a
   * single-value string enum) never synthesizes a spurious sibling.
   */
  omittedProperties?: Set<string>
}

/**
 * The primary-constructor property list of a `data class` — the VALUE
 * that renders after the `data class Name` head, parentheses included.
 *
 * Exported because `KotlinProjection` builds it directly for a top-level
 * object model: the declaration shell only makes sense where there is a
 * name to attach it to.
 */
export class KotlinObjectProperties extends KtSnippet {
  properties: Record<string, TypeSystemValue>
  required: string[]
  /** Per-property readOnly/writeOnly — see SLOT(visibility). */
  visibility: Record<string, Visibility>
  parameterList: KtParameterList
  /** The claiming sealed parents' names — the inline ` : Pet` clause. */
  supertypes: string[]

  constructor(
    {
      context,
      generatorKey,
      destinationPath,
      properties,
      required = [],
      rootRef,
      additionalPropertiesRecord,
      supertypes = [],
      omittedProperties,
    }: KotlinObjectPropertiesArgs,
  ) {
    super({ context, generatorKey })

    this.required = required
    this.supertypes = supertypes

    // Discriminator omission happens BEFORE the walk — a walked
    // discriminator schema would synthesize a spurious enum sibling.
    const propertyEntries = Object.entries(properties).filter(
      ([key]) => !omittedProperties?.has(key),
    )

    // The property loop: every value comes from the router — a snippet,
    // never rendered text. Optionality flows into each leaf's modifiers.
    this.properties = Object.fromEntries(
      propertyEntries.map(([key, property]) => [
        key,
        toKotlinValue({
          destinationPath,
          schema: property,
          required: required.includes(key),
          context,
          rootRef,
        }),
      ]),
    )

    this.visibility = Object.fromEntries(
      propertyEntries.map(([key, property]) => [
        key,
        {
          readOnly: 'readOnly' in property && property.readOnly === true,
          writeOnly: 'writeOnly' in property && property.writeOnly === true,
        },
      ]),
    )

    // SLOT(object-properties): the Kotlin name is chosen first, then the
    // wire-name annotation is decided by comparing the two — sanitization
    // and renaming are different jobs that compose (skmtc-lang-kotlin §7).
    //
    // SLOT(visibility): this.visibility[key] carries readOnly/writeOnly.
    // Ignored here — Jackson DTOs are single-variant, and splitting them
    // into request/response classes is a `variant`-threading decision, not
    // a per-property one.
    const parameters: KtParameterArgs[] = propertyEntries.map(
      ([key, property]) => {
        const modifiers: Modifiers = {
          required: required.includes(key),
          nullable: 'nullable' in property ? property.nullable : undefined,
        }

        const name = sanitizePropertyName(camelCase(key))

        // A backticked hard keyword still EQUALS its wire key, so it needs
        // no annotation — compare the unescaped form.
        const annotations = name.replaceAll('`', '') === key ? [] : [
          new KtAnnotation({
            context,
            destinationPath,
            name: JSON_PROPERTY,
            packageName: JACKSON_ANNOTATION_PACKAGE,
            args: [`"${key}"`],
          }),
        ]

        return {
          name,
          // The SNIPPET, not `${snippet}` — passing the rendered string
          // would strand the imports it registered. It also already owns
          // the `?`, so `nullable` stays unset here.
          type: this.properties[key],
          defaultValue: isNullish(modifiers) ? 'null' : undefined,
          annotations,
        }
      },
    )

    if (additionalPropertiesRecord) {
      // The mixed form: declared properties AND arbitrary extra keys in one
      // class. Jackson's catch-all pair must sit on the backing field
      // (@field:JsonAnySetter — deserialization writes into the map) and
      // the getter (@get:JsonAnyGetter — serialization flattens it back);
      // on a bare constructor val the annotations would land on the
      // parameter, where Jackson never looks.
      const catchAllName = 'additionalProperties' in properties
        ? 'additionalPropertyValues'
        : 'additionalProperties'

      parameters.push({
        name: catchAllName,
        type: new KotlinCatchAllMap(additionalPropertiesRecord),
        defaultValue: 'mutableMapOf()',
        annotations: [
          new KtAnnotation({
            context,
            destinationPath,
            name: 'JsonAnySetter',
            target: 'field',
            packageName: JACKSON_ANNOTATION_PACKAGE,
          }),
          new KtAnnotation({
            context,
            destinationPath,
            name: 'JsonAnyGetter',
            target: 'get',
            packageName: JACKSON_ANNOTATION_PACKAGE,
          }),
        ],
      })
    }

    this.parameterList = new KtParameterList(parameters)
  }

  override toString(): string {
    // The value renders everything after the declaration head: the
    // parameter list, then the inline supertype clause (` : Pet`).
    const supertypeClause = this.supertypes.length > 0
      ? ` : ${this.supertypes.join(', ')}`
      : ''

    return `${this.parameterList}${supertypeClause}`
  }
}

/**
 * The catch-all parameter's type: the record channel's value in a
 * MUTABLE map — Jackson's any-setter writes entries during
 * deserialization, so `Map` would not do.
 */
class KotlinCatchAllMap {
  record: KotlinRecord

  constructor(record: KotlinRecord) {
    this.record = record
  }

  toString(): string {
    return `MutableMap<String, ${this.record.value}>`
  }
}

type KotlinRecordArgs = {
  context: GenerateContextType
  destinationPath: string
  schema: true | OasSchema | OasRef<'schema'>
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class KotlinRecord extends KtSnippet {
  value: TypeSystemValue

  constructor(
    { context, generatorKey, destinationPath, schema, rootRef }:
      KotlinRecordArgs,
  ) {
    super({ context, generatorKey })

    // additionalProperties: true (or an empty schema) means untyped
    // values — route to the unknown fallback, never throw.
    this.value = schema === true || isEmpty(schema)
      ? new KotlinUnknown({ context, destinationPath, generatorKey })
      : toKotlinValue({
        destinationPath,
        schema,
        required: true,
        context,
        rootRef,
      })
  }

  override toString(): string {
    // SLOT(record): string-keyed map of this.value.
    return `Map<String, ${this.value}>`
  }
}
