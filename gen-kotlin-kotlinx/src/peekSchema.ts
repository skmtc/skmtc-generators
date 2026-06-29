import type { GenerateContextType, OasRef, OasSchema, RefName } from '@skmtc/core'

/**
 * Resolve a schema's shape without touching the engine's recursion
 * counter — the dispatch-time peek `toIdentifierType` uses (the counting
 * read, `context.resolveSchemaRefOnce`, belongs to projection
 * constructors).
 *
 * Lives in its own leaf module (imports only core) so `base.ts` can call
 * it from `toIdentifierType` without dragging the `Kt.ts` → `KtRef` →
 * `KtModelProjection` → `base.ts` cycle through `base.ts` — which would
 * leave `KtModelBase` in the temporal dead zone when the projection's
 * `extends` clause evaluates.
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
