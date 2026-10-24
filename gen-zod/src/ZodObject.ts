import { isEmpty } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'
import type {
  CustomValue,
  GenerateContextType,
  GeneratorKey,
  Modifiers,
  OasObject,
  OasRef,
  OasSchema,
  RefName,
  Stringable,
  TypeSystemObjectProperties,
  TypeSystemRecord,
  TypeSystemValue
} from '@skmtc/core'
import { toZodValue } from '@/src/Zod.ts'
import { Loop, Maybe, Wrap } from '@/src/Maybe.ts'
import { ZodModifiers } from '@/src/ZodModifiers.ts'
import { ZodUnknown } from '@/src/ZodUnknown.ts'

type ZodObjectProps = {
  context: GenerateContextType
  destinationPath: string
  objectSchema: OasObject
  modifiers: Modifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ZodObject extends TsSnippet {
  type = 'object' as const
  recordProperties: TypeSystemRecord | null
  objectProperties: TypeSystemObjectProperties | null
  modifiers: Modifiers
  content: Stringable
  modifierCalls: ZodModifiers

  constructor({
    context,
    generatorKey,
    destinationPath,
    objectSchema,
    modifiers,
    rootRef
  }: ZodObjectProps) {
    super({ context, generatorKey, stackTrail: objectSchema.stackTrail.clone() })

    this.modifiers = modifiers
    this.modifierCalls = new ZodModifiers(modifiers)

    const { properties, required, additionalProperties } = objectSchema

    const recordProperties = additionalProperties
      ? new ZodRecord({
          context,
          generatorKey,
          destinationPath,
          schema: additionalProperties,
          rootRef
        })
      : null

    const objectProperties =
      properties && !isEmpty(properties)
        ? new ZodObjectProperties({
            context,
            generatorKey,
            destinationPath,
            properties,
            required, // 'required' here refers to the object's properties, not object itself,
            rootRef
          })
        : null

    this.recordProperties = recordProperties
    this.objectProperties = objectProperties

    // Properties and additionalProperties together intersect; either alone
    // renders as itself; neither is an empty object.
    switch (true) {
      case objectProperties !== null && recordProperties !== null:
        this.content = new Wrap([objectProperties, '.and(', recordProperties, ')'])
        break
      case recordProperties !== null:
        this.content = recordProperties
        break
      case objectProperties !== null:
        this.content = objectProperties
        break
      default:
        this.content = 'z.object({})'
    }

    this.register({ imports: { zod: ['z'] }, destinationPath })
  }

  override toString(): string {
    return `${this.content}${this.modifierCalls}`
  }
}

type ZodObjectPropertiesArgs = {
  context: GenerateContextType
  destinationPath: string
  properties: Record<string, OasSchema | OasRef<'schema'> | CustomValue>
  required: OasObject['required']
  generatorKey: GeneratorKey
  rootRef?: RefName
}

class ZodObjectProperties extends TsSnippet {
  properties: Record<string, TypeSystemValue>
  required: string[]
  entries: Loop<ZodProperty>

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

    this.entries = new Loop(
      Object.entries(this.properties).map(([key, value]) => new ZodProperty({ key, value }))
    )
  }

  override toString(): string {
    return `z.object({${this.entries}})`
  }
}

type ZodPropertyArgs = {
  key: string
  value: TypeSystemValue
}

/** `key: value`, quoting a key that is not a valid bare identifier. */
class ZodProperty {
  key: Wrap
  value: TypeSystemValue

  constructor({ key, value }: ZodPropertyArgs) {
    const quote = Maybe.when(/[^a-zA-Z0-9_$]|^\d/.test(key), () => '"')

    this.key = new Wrap([quote, key, quote])
    this.value = value
  }

  toString(): string {
    return `${this.key}: ${this.value}`
  }
}

type ZodRecordArgs = {
  context: GenerateContextType
  destinationPath: string
  schema: true | OasSchema | OasRef<'schema'>
  generatorKey: GeneratorKey
  rootRef?: RefName
}

class ZodRecord extends TsSnippet {
  value: TypeSystemValue | 'true'

  constructor({ context, generatorKey, destinationPath, schema, rootRef }: ZodRecordArgs) {
    super({ context, generatorKey })

    if (schema === true || isEmpty(schema)) {
      this.value = new ZodUnknown({ context, destinationPath, generatorKey })
    } else {
      this.value = toZodValue({
        destinationPath,
        schema,
        required: true,
        context,
        rootRef
      })
    }
  }

  override toString(): string {
    return `z.record(z.string(), ${this.value})`
  }
}
