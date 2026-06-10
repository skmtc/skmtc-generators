import { isEmpty } from '@skmtc/core'
import type { GenerateContextType, ModelProjection, OasRef, OasSchema, RefName } from '@skmtc/core'
import { KtDataClassProjection } from './KtDataClassProjection.ts'
import { KtEnumClassProjection } from './KtEnumClassProjection.ts'
import { KtTypeAliasProjection } from './KtTypeAliasProjection.ts'
import { peekSchema } from './Kt.ts'
import { toEnumValues } from './toEnumEntryName.ts'

/**
 * The common static surface of gen-kotlin's three projection classes —
 * what the dispatch returns and `insertModel` / `ModelDriver` accept.
 */
export type KtProjection = ModelProjection<
  KtDataClassProjection | KtEnumClassProjection | KtTypeAliasProjection,
  undefined
>

/**
 * THE shape dispatch — the one shared, deterministic function that picks
 * a projection class (and so a Kotlin declaration kind) for a schema.
 * Both the transform and `KtRef` route through it, so a given refName
 * resolves to the same class wherever it is reached from; the three
 * classes share name/export-path derivation, keeping the
 * `(name, exportPath)` cache key and `generatorKey` integrity sound.
 *
 * - object with properties → `data class`
 * - string with enums → `enum class`
 * - everything else (primitives, arrays, maps, empty objects, unions,
 *   top-level refs) → `typealias`
 */
export const toKtProjection = (schema: OasSchema | OasRef<'schema'>): KtProjection => {
  if (schema.isRef()) {
    return KtTypeAliasProjection
  }

  switch (schema.type) {
    case 'object':
      return schema.properties && !isEmpty(schema.properties)
        ? KtDataClassProjection
        : KtTypeAliasProjection
    case 'string':
      return toEnumValues(schema.enums).length > 0 ? KtEnumClassProjection : KtTypeAliasProjection
    default:
      return KtTypeAliasProjection
  }
}

/** Dispatch for a refName — peeks the schema without counting a resolution. */
export const toKtProjectionForRef = (context: GenerateContextType, refName: RefName): KtProjection => {
  return toKtProjection(peekSchema(context, refName))
}
