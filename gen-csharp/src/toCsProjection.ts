import { isEmpty } from '@skmtc/core'
import type {
  GenerateContextType,
  ModelProjection,
  OasRef,
  OasSchema,
  RefName
} from '@skmtc/core'
import { CsAbstractRecordProjection } from './CsAbstractRecordProjection.ts'
import { CsRecordProjection } from './CsRecordProjection.ts'
import { CsEnumProjection } from './CsEnumProjection.ts'
import { isPolymorphicUnion } from './polymorphicMembership.ts'
import type { ModelEnrichment } from './modelNames.ts'
import { toEnumValues } from './toEnumValues.ts'

/**
 * The common static surface of gen-csharp's projection classes — what
 * the dispatch returns and `insertModel` / `ModelDriver` accept.
 */
export type CsProjection = ModelProjection<
  CsAbstractRecordProjection | CsRecordProjection | CsEnumProjection,
  ModelEnrichment
>

/**
 * THE shape dispatch — the one shared, deterministic function that picks
 * a projection class (and so a C# declaration kind) for a schema. The
 * transform and `CsRef` both route through it, so a given refName
 * resolves to the same class wherever it is reached from; the classes
 * share name/export-path derivation, keeping the `(name, exportPath)`
 * cache key and `generatorKey` integrity sound.
 *
 * Takes `context` because qualifying a discriminated union requires
 * peeking its members' targets — dispatch stays deterministic per
 * `(document, schema)`, which is what the cache-key argument needs.
 *
 * - object with properties → `record`
 * - string with enums → `enum`
 * - qualifying discriminated union (`isPolymorphicUnion`) →
 *   `abstract-record` (CS-B)
 * - everything else (primitives, arrays, maps, empty objects,
 *   non-qualifying unions, top-level refs) → **NON-DECLARABLE**
 *   (`undefined`): C# has no exported type alias (D6), so the
 *   transform emits NO artifact for the refName and ref sites inline
 *   the type expression instead — a deliberate, documented departure
 *   from gen-typescript/gen-kotlin full-refName coverage, matching C#
 *   ecosystem practice.
 */
export const toCsProjection = (
  context: GenerateContextType,
  schema: OasSchema | OasRef<'schema'>
): CsProjection | undefined => {
  if (schema.isRef()) {
    return undefined
  }

  switch (schema.type) {
    case 'object':
      return schema.properties && !isEmpty(schema.properties) ? CsRecordProjection : undefined
    case 'string':
      return toEnumValues(schema.enums).length > 0 ? CsEnumProjection : undefined
    case 'union':
      return isPolymorphicUnion(context, schema) ? CsAbstractRecordProjection : undefined
    default:
      return undefined
  }
}

/** Dispatch for a refName — peeks the schema without counting a resolution. */
export const toCsProjectionForRef = (
  context: GenerateContextType,
  refName: RefName
): CsProjection | undefined => {
  return toCsProjection(context, peekSchema(context, refName))
}

/**
 * Resolve a schema's shape without touching the engine's recursion
 * counter — the dispatch-time peek `toCsProjectionForRef` and `CsRef`'s
 * inlining branch use (the counting read,
 * `context.resolveSchemaRefOnce`, belongs to projection constructors).
 */
export const peekSchema = (
  context: GenerateContextType,
  refName: RefName
): OasSchema | OasRef<'schema'> => {
  const { document } = context

  const raw =
    document.type === 'oas'
      ? document.value.components?.schemas?.[refName]
      : document.value.registry.schemas[refName]

  if (!raw) {
    throw new Error(`Schema not found: ${refName}`)
  }

  return raw.isRef() ? raw.resolveOnce() : raw
}
