import { ContentBase, handleKey, isEmpty } from '@skmtc/core'
import type {
  GenerateContextType,
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
import { toZodValue } from './Zod.ts'
import { applyModifiers } from './applyModifiers.ts'
import { ZodUnknown } from './ZodUnknown.ts'

type ZodObjectProps = {
  context: GenerateContextType
  destinationPath: string
  objectSchema: OasObject
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ZodObject extends ContentBase {
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
  }: ZodObjectProps) {
    super({ context, generatorKey })

    this.modifiers = modifiers

    const { properties, required, additionalProperties } = objectSchema

    const hasProperties = properties && !isEmpty(properties)

    this.recordProperties = additionalProperties
      ? new ZodRecord({
          context,
          generatorKey,
          destinationPath,
          schema: additionalProperties,
          rootRef
        })
      : null

    this.objectProperties = hasProperties
      ? new ZodObjectProperties({
          context,
          generatorKey,
          destinationPath,
          properties,
          required, // 'required' here refers to the object's properties, not object itself,
          modifiers,
          rootRef
        })
      : null

    context.register({ imports: { zod: ['z'] }, destinationPath })
  }

  override toString(): string {
    const { objectProperties, recordProperties } = this

    if (objectProperties && recordProperties) {
      return applyModifiers(`${objectProperties}.and(${recordProperties})`, this.modifiers)
    }

    return applyModifiers(
      recordProperties?.toString() ?? objectProperties?.toString() ?? 'z.object({})',
      this.modifiers
    )
  }
}

type ZodObjectPropertiesArgs = {
  modifiers: Modifiers
  context: GenerateContextType
  destinationPath: string
  properties: Record<string, OasSchema | OasRef<'schema'> | CustomValue>
  required: OasObject['required']
  generatorKey: GeneratorKey
  rootRef?: RefName
}

class ZodObjectProperties extends ContentBase {
  properties: Record<string, TypeSystemValue>
  required: string[]

  constructor({
    context,
    generatorKey,
    destinationPath,
    properties,
    required = [],
    rootRef
  }: ZodObjectPropertiesArgs) {
    super({ context, generatorKey })

    this.required = required

    this.properties = Object.fromEntries(
      Object.entries(properties).map(([key, property]) => {
        const value = toZodValue({
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
    return `z.object({${Object.entries(this.properties)
      .map(([key, value]) => {
        // Check if key needs quotes
        const needsQuotes = /[^a-zA-Z0-9_$]/.test(key) || /^\d/.test(key)
        const formattedKey = needsQuotes ? `"${key}"` : key
        return `${formattedKey}: ${value}`
      })
      .join(', ')}})`
  }
}

type ZodRecordArgs = {
  context: GenerateContextType
  destinationPath: string
  schema: true | OasSchema | OasRef<'schema'>
  generatorKey: GeneratorKey
  rootRef?: RefName
}

class ZodRecord extends ContentBase {
  value: TypeSystemValue | 'true'

  constructor({ context, generatorKey, destinationPath, schema, rootRef }: ZodRecordArgs) {
    super({ context, generatorKey })

    if (schema === true || isEmpty(schema)) {
      this.value = new ZodUnknown({ context, destinationPath, generatorKey })
    } else {
      this.value = toZodValue({ destinationPath, schema, required: true, context, rootRef })
    }
  }

  override toString(): string {
    return `z.record(z.string(), ${this.value})`
  }
}
