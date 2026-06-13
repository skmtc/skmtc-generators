import { isEmpty } from '@skmtc/core'
import type { GenerateContextType, OasRef, OasSchema } from '@skmtc/core'
import type { KtEntityKind } from '@skmtc/lang-kotlin'
import { isSealedUnion } from './sealedMembership.ts'
import { toEnumValues } from './toEnumEntryName.ts'

/**
 * THE shape dispatch — the single, deterministic function that maps a
 * schema to its Kotlin declaration **kind**. Now that `toIdentifierType`
 * is context-aware, this is what was the old per-class `toKtProjection`
 * dispatch, returning a `KtEntityKind` instead of a projection class —
 * so ONE projection (`KtModelProjection`) covers every refName, its
 * `toIdentifierType` reads the kind from here, and its constructor reads
 * the value-shape from here too: the kind and the value can never
 * disagree.
 *
 * Takes `context` because qualifying a discriminated union requires
 * peeking its members' targets; dispatch stays deterministic per
 * `(document, schema)`, which is what the cache-key path needs.
 *
 * - object with properties → `data-class`
 * - string with enums → `enum-class`
 * - qualifying discriminated union (`isSealedUnion`) → `sealed-interface`
 * - everything else (primitives, arrays, maps, empty objects,
 *   non-qualifying unions, top-level refs) → `typealias`
 *
 * Leaf module (core + lang kind type + sealedMembership + enum helper, no
 * value classes / `Kt.ts` / `KtRef`) so `base.ts` can import it without a
 * module-init cycle.
 */
export const toKtModelShape = (
  context: GenerateContextType,
  schema: OasSchema | OasRef<'schema'>
): KtEntityKind => {
  if (schema.isRef()) {
    return 'typealias'
  }

  switch (schema.type) {
    case 'object':
      return schema.properties && !isEmpty(schema.properties) ? 'data-class' : 'typealias'
    case 'string':
      return toEnumValues(schema.enums).length > 0 ? 'enum-class' : 'typealias'
    case 'union':
      return isSealedUnion(context, schema) ? 'sealed-interface' : 'typealias'
    default:
      return 'typealias'
  }
}
