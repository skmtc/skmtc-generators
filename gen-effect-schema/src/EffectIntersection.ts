import { TsSnippet } from '@skmtc/lang-typescript'
import type {
  GenerateContextType,
  GeneratorKey,
  OasIntersection,
  OasRef,
  OasSchema,
  RefParts,
  TypeSystemValue,
} from '@skmtc/core'
import { toEffectValueImpl } from './Effect.ts'
import { EffectObject, EffectObjectProperties } from './EffectObject.ts'
import { EffectUnknown } from './EffectScalars.ts'
import { hasFields, isBare } from './fields.ts'
import {
  type FlatObject,
  toFlatModel,
  toFlatObjectOrThrow,
} from './flatObject.ts'
import { LIB, LIB_MODULE } from './lib.ts'
import {
  applyModifiers,
  type EffectModifiers,
  libImports,
} from './modifiers.ts'

type EffectIntersectionArgs = {
  context: GenerateContextType
  destinationPath: string
  schema: OasIntersection
  modifiers: EffectModifiers
  generatorKey: GeneratorKey
  rootRef?: RefParts
  coerce?: boolean
}

/**
 * Effect has no intersection: one struct with the fields of every member,
 * `Schema.Struct({...Animal.fields, name: Schema.optional(Schema.String)})`.
 */
export class EffectIntersection extends TsSnippet {
  type = 'intersection' as const
  members: TypeSystemValue[]
  modifiers: EffectModifiers
  /** The members whose fields are spread: those that are models. */
  spreads: TypeSystemValue[]
  /** The fields no spread gives as the intersection has them. */
  ownFields: EffectObjectProperties
  /** See `hasFields`. */
  fieldsKnown: boolean

  constructor(
    {
      context,
      generatorKey,
      destinationPath,
      schema,
      modifiers,
      rootRef,
      coerce = false,
    }: EffectIntersectionArgs,
  ) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    const flat = toFlatObjectOrThrow(schema)

    this.members = schema.members.map((member) => {
      const value = toEffectValueImpl({
        destinationPath,
        schema: member,
        required: true,
        context,
        rootRef,
        coerce,
      })

      // Any value (`{ description }`) adds no field.
      if (!hasFields(value) && !(value instanceof EffectUnknown)) {
        throw new Error(
          `${schema.stackTrail.toSchemaPointer()} is an intersection that Effect cannot write: the fields of its member ${
            toLabel(member)
          } are not known. A member must be an object that is not in a cycle, is not nullable, and has no additionalProperties or default.`,
        )
      }

      return value
    })

    // Next to a reference: no member above has any.
    if (flat.additionalProperties !== undefined) {
      throw new Error(
        `${schema.stackTrail.toSchemaPointer()} is an intersection that Effect cannot write: a member has additionalProperties next to a reference.`,
      )
    }

    this.modifiers = modifiers
    this.fieldsKnown = isBare(modifiers)

    // An inline object's fields are in `ownFields`.
    this.spreads = this.members.filter((member) =>
      hasFields(member) && !(member instanceof EffectObject)
    )

    this.ownFields = new EffectObjectProperties({
      context,
      generatorKey,
      destinationPath,
      properties: Object.fromEntries(
        toOwnKeys({ schema, flat }).map((key) => [key, flat.properties[key]]),
      ),
      required: flat.required,
      rootRef,
      coerce,
    })

    this.register({
      imports: { [LIB_MODULE]: libImports(modifiers) },
      destinationPath,
    })
  }

  override toString(): string {
    const spreads = this.spreads.map((spread) => `...${spread}.fields`)
    const fields = [...spreads, `${this.ownFields.fields}`]
      .filter((field) => field !== '')
      .join(', ')

    return applyModifiers(`${LIB}.Struct({${fields}})`, this.modifiers)
  }
}

const toLabel = (member: OasSchema | OasRef<'schema'>): string =>
  member.isRef() ? member.$ref : member.stackTrail.toSchemaPointer()

type ToOwnKeysArgs = {
  schema: OasIntersection
  flat: FlatObject
}

/**
 * The keys that the struct writes itself: those of an inline object, those of
 * more than one model, those next to a reference, and those a model leaves
 * optional and another member requires. A spread gives the others: it is the
 * model's own fields, without the keywords next to the reference to it.
 */
const toOwnKeys = ({ schema, flat }: ToOwnKeysArgs): string[] => {
  const models = schema.members.flatMap((member) => {
    const result = member.isRef() || 'members' in member
      ? toFlatModel(member)
      : undefined

    return result?.type === 'flat' ? [result.flat] : []
  })

  const inlineKeys = schema.members.flatMap((member) =>
    'properties' in member && !member.isRef()
      ? Object.keys(member.properties ?? {})
      : []
  )

  return Object.keys(flat.properties).filter((key) => {
    const owners = models.filter(({ properties }) =>
      Object.hasOwn(properties, key)
    )

    return inlineKeys.includes(key) || owners.length !== 1 ||
      owners[0].properties[key] !== flat.properties[key] ||
      (flat.required.includes(key) && !owners[0].required.includes(key))
  })
}
