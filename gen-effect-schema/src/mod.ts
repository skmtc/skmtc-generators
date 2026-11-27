import { toModelEntry, type DeclaredProjection } from '@skmtc/core'
import { typescriptProjections } from '@skmtc/gen-typescript'
import denoJson from '../deno.json' with { type: 'json' }
import { type EnrichmentSchema, toEnrichmentSchema } from './enrichments.ts'
import { EffectProjection } from './EffectProjection.ts'

/**
 * Every projection class gen-effect-schema can insert: its own, and
 * gen-typescript's, for the type of a recursive model. A generator that
 * inserts from gen-effect-schema spreads this list into its entry's
 * `projections`.
 */
export const effectSchemaProjections: readonly DeclaredProjection[] = [
  EffectProjection,
  ...typescriptProjections,
]

export const effectSchemaEntry = toModelEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  projections: effectSchemaProjections,
  transform({ context, ref, variant }) {
    // The projection registers itself into the barrel; see EffectProjection.
    context.insertModel(EffectProjection, ref, { variant })
  },
})
