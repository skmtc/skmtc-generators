import { SnippetBase, isEmpty } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey, OasRef, OasSchema, OasObject, CustomValue, RefName, TypeSystemObjectProperties, TypeSystemRecord, TypeSystemValue, Modifiers } from '@skmtc/core'
import { toValibotValue } from './Valibot.ts'
import { applyModifiers } from './applyModifiers.ts'
import { ValibotUnknown } from './ValibotUnknown.ts'

type ValibotObjectProps = {
  context: GenerateContextType
  destinationPath: string
  objectSchema: OasObject
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ValibotObject extends TsSnippet {
  type = 'object' as const
  recordProperties: TypeSystemRecord | null
  objectProperties: TypeSystemObjectProperties | null
  modifiers: Modifiers
  /**
   * The properties `v.variant` can switch on (see `isVariantOption`). None
   * for a nullable object, which valibot does not type as an option. None
   * for one with a record beside its properties either: valibot takes its
   * `v.objectWithRest` form, but no fixture covers that option yet, so such
   * a union stays a `v.union`.
   */
  variantKeys: string[]

  constructor({
    context,
    generatorKey,
    destinationPath,
    objectSchema,
    modifiers,
    rootRef
  }: ValibotObjectProps) {
    super({ context, generatorKey, stackTrail: objectSchema.stackTrail.clone() })

    this.modifiers = modifiers

    const { properties, required, additionalProperties } = objectSchema

    const hasProperties = properties && !isEmpty(properties)

    this.recordProperties = additionalProperties
      ? new ValibotRecord({
          context,
          generatorKey,
          destinationPath,
          schema: additionalProperties,
          rootRef
        })
      : null

    // With properties too, the record's value becomes the object's rest.
    const objectProperties = hasProperties
      ? new ValibotObjectProperties({
          context,
          generatorKey,
          destinationPath,
          properties,
          required,
          modifiers,
          rest: this.recordProperties?.value,
          rootRef
        })
      : null

    this.objectProperties = objectProperties

    this.variantKeys =
      this.recordProperties || modifiers.nullable || !objectProperties ? [] : Object.keys(objectProperties.properties)

    this.register({ imports: { valibot: [{ '*': 'v' }] }, destinationPath })
  }

  override toString(): string {
    const { objectProperties, recordProperties } = this

    return applyModifiers(
      objectProperties?.toString() ?? recordProperties?.toString() ?? 'v.object({})',
      this.modifiers
    )
  }
}

type ValibotObjectPropertiesArgs = {
  modifiers: Modifiers
  context: GenerateContextType
  destinationPath: string
  properties: Record<string, OasSchema | OasRef<'schema'> | CustomValue>
  required: OasObject['required']
  generatorKey: GeneratorKey
  /** The value of `additionalProperties`, which the keys not named here must match. */
  rest: TypeSystemValue | 'true' | undefined
  rootRef?: RefName
}

class ValibotObjectProperties extends SnippetBase {
  properties: Record<string, TypeSystemValue>
  required: string[]
  rest: TypeSystemValue | 'true' | undefined

  constructor({
    context,
    generatorKey,
    destinationPath,
    properties,
    required = [],
    rest,
    rootRef
  }: ValibotObjectPropertiesArgs) {
    super({ context, generatorKey })

    this.required = required
    this.rest = rest

    this.properties = Object.fromEntries(
      Object.entries(properties).map(([key, property]) => {
        const value = toValibotValue({
          destinationPath,
          schema: property,
          required: required?.includes(key),
          context,
          rootRef
        })

        return [key, value]
      })
    )
  }

  override toString(): string {
    const entries = `{${Object.entries(this.properties)
      .map(([key, value]) => {
        // Check if key needs quotes
        const needsQuotes = /[^a-zA-Z0-9_$]/.test(key) || /^\d/.test(key)
        const formattedKey = needsQuotes ? `"${key}"` : key
        return `${formattedKey}: ${value}`
      })
      .join(', ')}}`

    // `additionalProperties` covers only the keys `properties` does not
    // name, as `v.objectWithRest` does. `v.intersect` with `v.record`
    // checked the record against every key, so a typed record rejected the
    // named ones.
    return this.rest ? `v.objectWithRest(${entries}, ${this.rest})` : `v.object(${entries})`
  }
}

type ValibotRecordArgs = {
  context: GenerateContextType
  destinationPath: string
  schema: true | OasSchema | OasRef<'schema'>
  generatorKey: GeneratorKey
  rootRef?: RefName
}

class ValibotRecord extends SnippetBase {
  value: TypeSystemValue | 'true'

  constructor({ context, generatorKey, destinationPath, schema, rootRef }: ValibotRecordArgs) {
    super({ context, generatorKey })

    // Not ts-pattern: its type walk over `OasRef`, whose keywords include
    // `additionalProperties`, circles back on itself.
    this.value =
      schema === true || isEmpty(schema)
        ? new ValibotUnknown({ context, destinationPath, generatorKey })
        : toValibotValue({ destinationPath, schema, required: true, context, rootRef })
  }

  override toString(): string {
    return `v.record(v.string(), ${this.value})`
  }
}
