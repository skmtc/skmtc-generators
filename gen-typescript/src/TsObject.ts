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

    this.recordProperties = additionalProperties
      ? new TsRecord({
          context,
          generatorKey,
          destinationPath,
          schema: additionalProperties,
          rootRef
        })
      : null

    this.objectProperties = hasProperties
      ? new TsObjectProperties({
          context,
          generatorKey,
          destinationPath,
          properties,
          required,
          modifiers,
          rootRef
        })
      : null
  }

  override toString(): string {
    const { objectProperties, recordProperties } = this

    if (objectProperties && recordProperties) {
      return applyModifiers(`${objectProperties} | ${recordProperties}`, this.modifiers)
    }

    return applyModifiers(
      recordProperties?.toString() ?? objectProperties?.toString() ?? 'Record<string, never>',
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
  rootRef?: RefName
}

class TsObjectProperties extends SnippetBase {
  properties: Record<string, TypeSystemValue>
  required: string[]

  constructor({
    context,
    generatorKey,
    destinationPath,
    properties,
    required = [],
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
  }

  override toString(): string {
    return `{${Object.entries(this.properties)
      .map(([key, value]) => {
        const optionality = 'modifiers' in value ? (value.modifiers.required ? '' : '?') : ''

        return `${key}${optionality}: ${value}`
      })
      .join(', ')}}`
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

  constructor({ context, generatorKey, destinationPath, schema, rootRef }: TsRecordArgs) {
    super({ context, generatorKey })

    // Not ts-pattern: its type walk over `OasRef`, whose keywords include
    // `additionalProperties`, circles back on itself.
    this.value =
      schema === true || isEmpty(schema)
        ? new TsUnknown({ context, generatorKey })
        : toTsValue({ destinationPath, schema, required: true, context, rootRef })
  }

  // An index signature, not `Record<string, …>`: TypeScript expands the
  // alias eagerly, so a model that holds itself in a record
  // (`type Bag = Record<string, Bag>`) fails with TS2456.
  override toString(): string {
    return `{[key: string]: ${this.value}}`
  }
}
