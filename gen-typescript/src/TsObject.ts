import { SnippetBase, isEmpty } from '@skmtc/core'
import { TsSnippet, handleKey } from '@skmtc/lang-typescript'
import type { GenerateContextType, OasRef, GeneratorKey, OasSchema, OasObject, CustomValue, RefName, TypeSystemObjectProperties, TypeSystemRecord, TypeSystemValue, Modifiers } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { toTsValue } from './Ts.ts'
import { TsUnknown } from './TsUnknown.ts'

type TsObjectProps = {
  context: GenerateContextType
  destinationPath: string
  value: OasObject
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class TsObject extends TsSnippet {
  type = 'object' as const
  recordProperties: TypeSystemRecord | null
  objectProperties: TypeSystemObjectProperties | null
  modifiers: Modifiers

  constructor({
    context,
    generatorKey,
    destinationPath,
    value,
    modifiers,
    rootRef
  }: TsObjectProps) {
    super({ context, generatorKey, stackTrail: value.stackTrail.clone() })

    this.modifiers = modifiers

    const { properties, required, additionalProperties } = value

    const hasProperties = properties && !isEmpty(properties)

    const record = additionalProperties
      ? new TsRecord({
          context,
          generatorKey,
          destinationPath,
          schema: additionalProperties,
          rootRef
        })
      : null

    this.recordProperties = record

    // With named properties too, the record goes into the same object
    // literal as its index signature.
    this.objectProperties = hasProperties
      ? new TsObjectProperties({
          context,
          generatorKey,
          destinationPath,
          properties,
          required,
          modifiers,
          record,
          rootRef
        })
      : null
  }

  override toString(): string {
    const { objectProperties, recordProperties } = this

    return applyModifiers(
      objectProperties?.toString() ?? recordProperties?.toString() ?? 'Record<string, never>',
      this.modifiers
    )
  }
}

type TsObjectPropertiesArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  destinationPath: string
  properties: Record<string, OasSchema | OasRef<'schema'> | CustomValue>
  required: OasObject['required']
  modifiers: Modifiers
  record: TsRecord | null
  rootRef?: RefName
}

class TsObjectProperties extends SnippetBase {
  properties: Record<string, TypeSystemValue>
  required: string[]
  indexSignature: TsIndexSignature | null

  constructor({
    context,
    generatorKey,
    destinationPath,
    properties,
    required = [],
    record,
    rootRef
  }: TsObjectPropertiesArgs) {
    super({ context, generatorKey })

    this.required = required

    this.properties = Object.fromEntries(
      Object.entries(properties).map(([key, property]) => {
        const value = toTsValue({
          destinationPath,
          schema: property,
          required: required?.includes(key),
          context,
          rootRef
        })

        return [handleKey(key), value]
      })
    )

    this.indexSignature = record
      ? new TsIndexSignature({
          context,
          generatorKey,
          value: record.value,
          propertyValues: Object.values(this.properties)
        })
      : null
  }

  override toString(): string {
    const entries = Object.entries(this.properties).map(([key, value]) => {
      const optionality = 'modifiers' in value ? (value.modifiers.required ? '' : '?') : ''

      return `${key}${optionality}: ${value}`
    })

    const indexEntries = this.indexSignature ? [`${this.indexSignature}`] : []

    return `{${[...entries, ...indexEntries].join(', ')}}`
  }
}

type TsRecordArgs = {
  context: GenerateContextType
  destinationPath: string
  schema: true | OasSchema | OasRef<'schema'>
  generatorKey: GeneratorKey
  rootRef?: RefName
}

class TsRecord extends SnippetBase {
  value: TypeSystemValue | 'true'
  indexSignature: TsIndexSignature

  constructor({ context, generatorKey, destinationPath, schema, rootRef }: TsRecordArgs) {
    super({ context, generatorKey })

    // Not ts-pattern: its type walk over `OasRef`, whose keywords include
    // `additionalProperties`, circles back on itself.
    this.value =
      schema === true || isEmpty(schema)
        ? new TsUnknown({ context, generatorKey })
        : toTsValue({ destinationPath, schema, required: true, context, rootRef })

    this.indexSignature = new TsIndexSignature({
      context,
      generatorKey,
      value: this.value,
      propertyValues: []
    })
  }

  // An index signature, not `Record<string, …>`: TypeScript expands the
  // alias eagerly, so a model that holds itself in a record
  // (`type Bag = Record<string, Bag>`) fails with TS2456.
  override toString(): string {
    return `{${this.indexSignature}}`
  }
}

type TsIndexSignatureArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  value: TypeSystemValue | 'true'
  propertyValues: TypeSystemValue[]
}

class TsIndexSignature extends SnippetBase {
  valueTypes: Array<TypeSystemValue | 'true'>

  constructor({ context, generatorKey, value, propertyValues }: TsIndexSignatureArgs) {
    super({ context, generatorKey })

    // The value type takes in the type of each named property beside it:
    // TypeScript rejects a property that the index type does not accept
    // (TS2411), so `{id: string, [key: string]: number}` does not compile.
    // `unknown` already accepts every property.
    // A type can repeat (`number | string | string`): a repeat is valid and
    // means the same type, and removing it would mean rendering each member
    // to compare them before render.
    this.valueTypes = value instanceof TsUnknown ? [value] : [value, ...propertyValues]
  }

  override toString(): string {
    const valueType = this.valueTypes.map(valueType => `${valueType}`).join(' | ')

    return `[key: string]: ${valueType}`
  }
}
