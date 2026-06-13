import type { CustomValue, GenerateContextType, OasObject, OasRef, OasSchema } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { getModelConfig } from '@/modelConfig.ts'
import { ListModelField, ModelField, type AddField } from '@/model/ModelField.ts'
import type { SharedHashes } from '@/model/structuralHash.ts'
import { KtListType } from '@/model/types/KtTypes.ts'
import { toKtType } from '@/model/types/toKtType.ts'

type ToModelFieldsArgs = {
  context: GenerateContextType
  schema: OasObject
  destinationPath: string
  sharedHashes: SharedHashes
  /**
   * Component-shaped classes sort (required-first, alphabetical, hoist
   * field first — per-target Stainless config); top-level response
   * classes keep the allOf-merge order in a stable required-first
   * partition.
   */
  sorted?: boolean
  /** Restrict to these wire names (the envelope model). */
  includeOnly?: string[]
  /** Enrichment field injections, threaded to the `data`-level nested class. */
  addFieldsForData?: AddField[]
}

/** Walks an object schema's properties into field producers, in corpus order. */
export const toModelFields = ({
  context,
  schema,
  destinationPath,
  sharedHashes,
  sorted,
  includeOnly,
  addFieldsForData
}: ToModelFieldsArgs): ModelField[] => {
  const required = new Set(schema.required ?? [])

  const fields = Object.entries(schema.properties ?? {})
    .filter(([wireName]) => !includeOnly || includeOnly.includes(wireName))
    .map(([wireName, property]) =>
      toModelField({
        context,
        wireName,
        property,
        specRequired: required.has(wireName),
        destinationPath,
        sharedHashes,
        addFieldsForData: wireName === 'data' ? addFieldsForData : undefined
      })
    )

  return sorted
    ? orderSortedFields(fields)
    : [
        ...fields.filter(field => field.fenceRequired),
        ...fields.filter(field => !field.fenceRequired)
      ]
}

type ToModelFieldArgs = {
  context: GenerateContextType
  wireName: string
  property: OasSchema | OasRef<'schema'> | CustomValue
  specRequired: boolean
  destinationPath: string
  sharedHashes: SharedHashes
  addFieldsForData?: AddField[]
}

/** The field router — the ONE place the list-vs-scalar field shape is chosen. */
const toModelField = ({
  context,
  wireName,
  property,
  specRequired,
  destinationPath,
  sharedHashes,
  addFieldsForData
}: ToModelFieldArgs): ModelField => {
  invariant(
    !isCustomValue(property),
    `@skmtc/gen-kotlin-sdk: CustomValue property '${wireName}' is not expected on this surface`
  )

  const resolved = property.isRef() ? property.resolve() : property

  const type = toKtType({
    context,
    schema: property,
    propertyName: wireName,
    destinationPath,
    sharedHashes,
    addFields: addFieldsForData
  })

  const shared = { context, wireName, schema: resolved, specRequired, destinationPath }

  return type instanceof KtListType
    ? new ListModelField({ ...shared, type })
    : new ModelField({ ...shared, type })
}

const isCustomValue = (
  property: OasSchema | OasRef<'schema'> | CustomValue
): property is CustomValue => {
  return !('isRef' in property)
}

/**
 * The Stainless field order for component-shaped classes: fence-
 * required group first, ALPHABETICAL within each group, the hoist
 * field (the target's resource primary key — `id` for OneBusAway,
 * `token` for Lithic) at the front of whichever group holds it.
 */
export const orderSortedFields = (fields: ModelField[]): ModelField[] => {
  const config = getModelConfig()
  const hoistField = config.hoistField ?? 'id'

  const byNameHoistFirst = (a: ModelField, b: ModelField) => {
    if (a.kotlinName === hoistField) return -1
    if (b.kotlinName === hoistField) return 1
    return a.kotlinName.localeCompare(b.kotlinName)
  }

  const required = fields.filter(field => field.fenceRequired).sort(byNameHoistFirst)
  const optional = fields.filter(field => !field.fenceRequired).sort(byNameHoistFirst)

  return [...required, ...optional]
}

/**
 * The stdlib-shadowing pass: where a sibling nested class named `List`
 * is in scope, list types qualify as `kotlin.collections.List`. Scope
 * accumulates downward through nested classes. Run ONCE from the
 * file-level owner.
 */
export const shadowFields = (fields: ModelField[], inherited: Set<string>): void => {
  const scope = new Set([...inherited, ...fields.flatMap(field => field.type.nestedClassNames)])

  fields.forEach(field => field.type.applyShadowing(scope))
}
