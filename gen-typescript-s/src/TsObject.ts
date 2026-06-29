import { SnippetBase, isEmpty } from '@skmtc/core'
import { TsSnippet, handleKey, withDescription } from '@skmtc/lang-typescript'
import type { GenerateContextType, OasRef, GeneratorKey, OasSchema, OasObject, CustomValue, RefName, TypeSystemObjectProperties, TypeSystemRecord, TypeSystemValue, Modifiers } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { toTsValue } from './Ts.ts'
import { TsUnknown } from './TsUnknown.ts'
import { match, P } from 'ts-pattern'

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
  /** Per-property schema description (the JSDoc), keyed like `properties`. Kept
   *  separate so `properties` still satisfies the core `TypeSystemObjectProperties`
   *  contract (`Record<string, TypeSystemValue>`). */
  descriptions: Record<string, string | undefined>

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
    this.descriptions = {}

    this.properties = Object.fromEntries(
      Object.entries(properties).map(([key, property]) => {
        const value = toTsValue({
          destinationPath,
          schema: property,
          required: required?.includes(key),
          context,
          rootRef
        })

        const handled = handleKey(key)
        this.descriptions[handled] =
          'description' in property && typeof property.description === 'string'
            ? property.description
            : undefined

        return [handled, value]
      })
    )
  }

  override toString(): string {
    // Each property on its own line, with its JSDoc and a blank line between —
    // openai-node's layout (Prettier preserves the blank lines + JSDoc but never
    // inserts them, and re-indents). `;` terminator (interface member).
    const members = Object.entries(this.properties).map(([key, value]) => {
      const optionality = 'modifiers' in value ? (value.modifiers.required ? '' : '?') : ''
      const declaration = `${key}${optionality}: ${value};`
      const description = this.descriptions[key]

      return description ? withDescription(declaration, { description }) : declaration
    })

    return `{\n${members.join('\n\n')}\n}`
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

    this.value = match(schema)
      .with(true, () => new TsUnknown({ context, generatorKey }))
      .with(
        P.when(schema => isEmpty(schema)),
        () => new TsUnknown({ context, generatorKey })
      )
      .otherwise(matched =>
        toTsValue({ destinationPath, schema: matched, required: true, context, rootRef })
      )
  }

  override toString(): string {
    return `Record<string, ${this.value}>`
  }
}
