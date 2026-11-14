import { isEmpty } from '@skmtc/core'
import { handleKey, TsSnippet } from '@skmtc/lang-typescript'
import type {
  CustomValue,
  GenerateContextType,
  GeneratorKey,
  OasObject,
  OasRef,
  OasSchema,
  RefName,
  TypeSystemValue,
} from '@skmtc/core'
import { toEffectValueImpl } from './Effect.ts'
import {
  applyModifiers,
  type EffectModifiers,
  libImports,
} from './modifiers.ts'
import { EffectUnknown } from './EffectScalars.ts'
import { LIB, LIB_MODULE } from './lib.ts'

type EffectObjectArgs = {
  context: GenerateContextType
  destinationPath: string
  objectSchema: OasObject
  modifiers: EffectModifiers
  generatorKey: GeneratorKey
  rootRef?: RefName
  coerce?: boolean
}

export class EffectObject extends TsSnippet {
  type = 'object' as const
  objectProperties: EffectObjectProperties | null
  recordProperties: EffectRecord | null
  modifiers: EffectModifiers

  constructor(
    {
      context,
      generatorKey,
      destinationPath,
      objectSchema,
      modifiers,
      rootRef,
      coerce = false,
    }: EffectObjectArgs,
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
      ? new EffectRecord({
        context,
        generatorKey,
        destinationPath,
        schema: additionalProperties,
        rootRef,
        coerce,
      })
      : null

    this.objectProperties = hasProperties
      ? new EffectObjectProperties({
        context,
        generatorKey,
        destinationPath,
        properties,
        // 'required' lists which PROPERTIES are required — it is not
        // about the object itself. Each property's optionality renders
        // at that property's own leaf via its modifiers.
        required,
        rootRef,
        coerce,
      })
      : null

    this.register({
      imports: { [LIB_MODULE]: libImports(modifiers) },
      destinationPath,
    })
  }

  override toString(): string {
    const { objectProperties, recordProperties } = this

    // Properties plus additionalProperties: the struct with an index
    // signature, which is what gen-typescript emits for the same schema.
    if (objectProperties && recordProperties) {
      return applyModifiers(
        `${LIB}.StructWithRest(${objectProperties}, [${recordProperties}])`,
        this.modifiers,
      )
    }

    return applyModifiers(
      recordProperties?.toString() ?? objectProperties?.toString() ??
        `${LIB}.Struct({})`,
      this.modifiers,
    )
  }
}

type Visibility = {
  readOnly: boolean
  writeOnly: boolean
}

type EffectObjectPropertiesArgs = {
  context: GenerateContextType
  destinationPath: string
  properties: Record<string, OasSchema | OasRef<'schema'> | CustomValue>
  required: OasObject['required']
  generatorKey: GeneratorKey
  rootRef?: RefName
  coerce?: boolean
}

class EffectObjectProperties extends TsSnippet {
  properties: Record<string, TypeSystemValue>
  required: string[]
  /** Per-property readOnly/writeOnly. Not rendered: one variant. */
  visibility: Record<string, Visibility>

  constructor(
    {
      context,
      generatorKey,
      destinationPath,
      properties,
      required = [],
      rootRef,
      coerce = false,
    }: EffectObjectPropertiesArgs,
  ) {
    super({ context, generatorKey })

    this.required = required

    // The property loop: every value comes from the router — a snippet,
    // never rendered text. Optionality flows into each leaf's modifiers.
    this.properties = Object.fromEntries(
      Object.entries(properties).map(([key, property]) => [
        key,
        toEffectValueImpl({
          destinationPath,
          schema: property,
          required: required.includes(key),
          context,
          rootRef,
          coerce,
        }),
      ]),
    )

    this.visibility = Object.fromEntries(
      Object.entries(properties).map(([key, property]) => [
        key,
        {
          readOnly: 'readOnly' in property && property.readOnly === true,
          writeOnly: 'writeOnly' in property && property.writeOnly === true,
        },
      ]),
    )
  }

  override toString(): string {
    // handleKey quotes keys that aren't valid identifiers.
    const fields = Object.entries(this.properties)
      .map(([key, value]) => `${handleKey(key)}: ${value}`)
      .join(', ')

    return `${LIB}.Struct({${fields}})`
  }
}

type EffectRecordArgs = {
  context: GenerateContextType
  destinationPath: string
  schema: true | OasSchema | OasRef<'schema'>
  generatorKey: GeneratorKey
  rootRef?: RefName
  coerce?: boolean
}

class EffectRecord extends TsSnippet {
  value: TypeSystemValue

  constructor(
    { context, generatorKey, destinationPath, schema, rootRef, coerce = false }:
      EffectRecordArgs,
  ) {
    super({ context, generatorKey })

    // additionalProperties: true (or an empty schema) means untyped
    // values — route to the unknown fallback, never throw.
    this.value = schema === true || isEmpty(schema)
      ? new EffectUnknown({ context, destinationPath, generatorKey })
      : toEffectValueImpl({
        destinationPath,
        schema,
        required: true,
        context,
        rootRef,
        coerce,
      })
  }

  override toString(): string {
    return `${LIB}.Record(${LIB}.String, ${this.value})`
  }
}
