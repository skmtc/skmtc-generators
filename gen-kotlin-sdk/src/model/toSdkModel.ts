import type { OasObject, OasRef, OasSchema } from '@skmtc/core'
import { CustomValue, camelCase, capitalize } from '@skmtc/core'
import invariant from 'tiny-invariant'
import {
  orderSortedFields,
  toSingular,
  type SdkField,
  type SdkModel,
  type SdkType
} from './SdkModel.ts'

/** hash of a schema's canonical JSON → shared model class name */
export type SharedHashes = Map<string, string>

export type FieldStates = Record<string, 'required-nullable'>

export type FieldEnums = Record<string, string[]>

type ToSdkModelArgs = {
  schema: OasObject
  className: string
  sharedHashes: SharedHashes
  /** Envelope field names — present ⊆ top level marks the model. */
  envelopeFields?: string[]
  /** Per-wire-name state overrides (config-mirrored; see SdkField.docRequired). */
  fieldStates?: FieldStates
  /** Config-mirrored enum assertions for open string fields (wire name → members). */
  fieldEnums?: FieldEnums
  /**
   * Component-shaped classes sort fields (alphabetical within the
   * required-first groups, `id` hoisted); top-level response classes
   * keep the allOf-merge order. Nested walks always sort.
   */
  sortFields?: boolean
}

/**
 * Walks an object schema into the §C2 domain record. Inline objects
 * recurse into nested models; string enums become Known/Value enum
 * records; subtrees whose canonical JSON matches a shared-model hash
 * become references to the shared class.
 */
export const toSdkModel = ({
  schema,
  className,
  sharedHashes,
  envelopeFields,
  fieldStates,
  fieldEnums,
  sortFields
}: ToSdkModelArgs): SdkModel => {
  const properties = schema.properties ?? {}
  const required = new Set(schema.required ?? [])

  const fields: SdkField[] = Object.entries(properties).map(([wireName, property]) => {
    invariant(
      !(property instanceof CustomValue),
      `@skmtc/gen-kotlin-sdk: CustomValue property '${wireName}' is not expected on this surface`
    )

    const specRequired = required.has(wireName)
    // The config override only applies where the spec does NOT already
    // require the field (corpus: one site spec-requires limitExceeded
    // and renders it fully required).
    const requiredNullable = fieldStates?.[wireName] === 'required-nullable' && !specRequired
    const resolved = property.isRef() ? property.resolve() : property

    return {
      kotlinName: camelCase(wireName),
      wireName,
      type: toSdkType({
        schema: property,
        propertyName: wireName,
        sharedHashes,
        fieldStates,
        fieldEnums
      }),
      required: requiredNullable ? false : specRequired,
      docRequired: (specRequired && resolved.nullable !== true) || requiredNullable,
      fenceRequired: specRequired || requiredNullable,
      nullable: resolved.nullable === true,
      // $ref fields fall back to the referenced component's description
      description: resolved.description
    }
  })

  // Component-shaped (nested) classes: the Stainless sort (see
  // orderSortedFields). Top level: stable required-first partition
  // over the allOf-merge order.
  const ordered = sortFields
    ? orderSortedFields(fields)
    : [
        ...fields.filter(field => field.fenceRequired),
        ...fields.filter(field => !field.fenceRequired)
      ]

  const fieldNames = new Set(ordered.map(field => field.wireName))
  const envelope = (envelopeFields?.length ?? 0) > 0 &&
    (envelopeFields ?? []).every(name => fieldNames.has(name))

  return { className, description: schema.description, fields: ordered, envelope }
}

type ToSdkTypeArgs = {
  schema: OasSchema | OasRef<'schema'>
  propertyName: string
  sharedHashes: SharedHashes
  fieldStates?: FieldStates
  fieldEnums?: FieldEnums
}

const toSdkType = ({
  schema,
  propertyName,
  sharedHashes,
  fieldStates,
  fieldEnums
}: ToSdkTypeArgs): SdkType => {
  const resolved = schema.isRef() ? schema.resolve() : schema

  const shared = sharedHashes.get(toStructuralHash(resolved))

  if (shared) {
    return { kind: 'shared', className: shared }
  }

  switch (resolved.type) {
    case 'object':
      return {
        kind: 'model',
        model: toSdkModel({
          schema: resolved,
          className: capitalize(camelCase(propertyName)),
          sharedHashes,
          fieldStates,
          fieldEnums,
          sortFields: true
        })
      }
    case 'array': {
      const elementName = toSingular(propertyName)

      return {
        kind: 'list',
        element: toSdkType({
          schema: resolved.items,
          propertyName: elementName,
          sharedHashes,
          fieldStates,
          fieldEnums
        })
      }
    }
    case 'string': {
      const specMembers = (resolved.enums ?? []).filter(
        (member): member is string => typeof member === 'string'
      )

      const members = specMembers.length ? specMembers : (fieldEnums?.[propertyName] ?? [])

      if (members.length) {
        return {
          kind: 'enum',
          enumModel: {
            className: capitalize(camelCase(propertyName)),
            description: resolved.description,
            members
          }
        }
      }

      return { kind: 'scalar', kotlin: 'String' }
    }
    case 'integer':
      return { kind: 'scalar', kotlin: resolved.format === 'int32' ? 'Int' : 'Long' }
    case 'number':
      return { kind: 'scalar', kotlin: resolved.format === 'float' ? 'Float' : 'Double' }
    case 'boolean':
      return { kind: 'scalar', kotlin: 'Boolean' }
    default:
      throw new Error(
        `@skmtc/gen-kotlin-sdk: unmapped schema type '${resolved.type}' at property '${propertyName}'`
      )
  }
}

type AddField = { wireName: string; type: 'boolean' | 'string' | 'integer' | 'number' }

const scalarByType = {
  boolean: 'Boolean',
  string: 'String',
  integer: 'Long',
  number: 'Double'
} as const

/**
 * Applies enrichment `addFields` to the `data`-level nested model —
 * config-mirrored injection of fields the spec omits, inserted at the
 * alphabetical position (matches the corpus placements).
 */
export const injectDataFields = ({
  model,
  addFields,
  fieldStates
}: {
  model: SdkModel
  addFields: AddField[]
  fieldStates?: FieldStates
}): SdkModel => {
  const fields = model.fields.map(field => {
    if (field.wireName !== 'data' || field.type.kind !== 'model') {
      return field
    }

    const injected = addFields.map(addField => {
      const requiredNullable = fieldStates?.[addField.wireName] === 'required-nullable'

      return {
        kotlinName: camelCase(addField.wireName),
        wireName: addField.wireName,
        type: { kind: 'scalar', kotlin: scalarByType[addField.type] } as const,
        required: false,
        docRequired: requiredNullable,
        fenceRequired: requiredNullable,
        nullable: false,
        description: undefined
      }
    })

    const merged = orderSortedFields([...field.type.model.fields, ...injected])

    return {
      ...field,
      type: { ...field.type, model: { ...field.type.model, fields: merged } }
    }
  })

  return { ...model, fields }
}

/**
 * Canonical-JSON identity for shared-model matching (§C5): the
 * resolved schema's JSON form with object keys sorted. Two inline
 * occurrences of the same structure hash equal.
 */
export const toStructuralHash = (schema: OasSchema): string => {
  return canonicalize(schema.toJsonSchema({ resolve: true }))
}

const canonicalize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalize(entryValue)}`)

    return `{${entries.join(',')}}`
  }

  return JSON.stringify(value)
}
