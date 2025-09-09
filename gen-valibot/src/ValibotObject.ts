import { ContentBase, isEmpty } from '@skmtc/core'
import type {
  GenerateContext,
  GeneratorKey,
  OasRef,
  OasSchema,
  OasObject,
  CustomValue,
  RefName,
  TypeSystemObjectProperties,
  TypeSystemRecord,
  TypeSystemValue,
  Modifiers
} from '@skmtc/core'
import { toValibotValue } from './Valibot.ts'
import { applyModifiers } from './applyModifiers.ts'
import { ValibotUnknown } from './ValibotUnknown.ts'
import { match, P } from 'ts-pattern'

type ValibotObjectProps = {
  context: GenerateContext
  destinationPath: string
  objectSchema: OasObject
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ValibotObject extends ContentBase {
  type = 'object' as const
  recordProperties: TypeSystemRecord | null
  objectProperties: TypeSystemObjectProperties | null
  modifiers: Modifiers

  constructor({
    context,
    generatorKey,
    destinationPath,
    objectSchema,
    modifiers,
    rootRef
  }: ValibotObjectProps) {
    super({ context, generatorKey })

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

    this.objectProperties = hasProperties
      ? new ValibotObjectProperties({
          context,
          generatorKey,
          destinationPath,
          properties,
          required,
          modifiers,
          rootRef
        })
      : null

    context.register({ imports: { valibot: ['v'] }, destinationPath })
  }

  override toString(): string {
    const { objectProperties, recordProperties } = this

    if (objectProperties && recordProperties) {
      return applyModifiers(`v.intersect([${objectProperties}, ${recordProperties}])`, this.modifiers)
    }

    return applyModifiers(
      recordProperties?.toString() ?? objectProperties?.toString() ?? 'v.object({})',
      this.modifiers
    )
  }
}

type ValibotObjectPropertiesArgs = {
  modifiers: Modifiers
  context: GenerateContext
  destinationPath: string
  properties: Record<string, OasSchema | OasRef<'schema'> | CustomValue>
  required: OasObject['required']
  generatorKey: GeneratorKey
  rootRef?: RefName
}

class ValibotObjectProperties extends ContentBase {
  properties: Record<string, TypeSystemValue>
  required: string[]

  constructor({
    context,
    generatorKey,
    destinationPath,
    properties,
    required = [],
    rootRef
  }: ValibotObjectPropertiesArgs) {
    super({ context, generatorKey })

    this.required = required

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
    return `v.object({${Object.entries(this.properties)
      .map(([key, value]) => {
        // Check if key needs quotes
        const needsQuotes = /[^a-zA-Z0-9_$]/.test(key) || /^\d/.test(key)
        const formattedKey = needsQuotes ? `"${key}"` : key
        return `${formattedKey}: ${value}`
      })
      .join(', ')}})`
  }
}

type ValibotRecordArgs = {
  context: GenerateContext
  destinationPath: string
  schema: true | OasSchema | OasRef<'schema'>
  generatorKey: GeneratorKey
  rootRef?: RefName
}

class ValibotRecord extends ContentBase {
  value: TypeSystemValue | 'true'

  constructor({ context, generatorKey, destinationPath, schema, rootRef }: ValibotRecordArgs) {
    super({ context, generatorKey })

    this.value = match(schema)
      .with(true, () => new ValibotUnknown({ context, destinationPath, generatorKey }))
      .with(
        P.when(schema => isEmpty(schema)),
        () => new ValibotUnknown({ context, destinationPath, generatorKey })
      )
      .otherwise(matched =>
        toValibotValue({ destinationPath, schema: matched, required: true, context, rootRef })
      )
  }

  override toString(): string {
    return `v.record(v.string(), ${this.value})`
  }
}