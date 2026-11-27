import { toModelEntry, type DeclaredProjection } from '@skmtc/core'
import denoJson from '../deno.json' with { type: 'json' }
import { type EnrichmentSchema, toEnrichmentSchema } from './enrichments.ts'
import { KotlinProjection } from './KotlinProjection.ts'

/**
 * Every projection class gen-kotlin-jackson can insert. A generator that
 * inserts from gen-kotlin-jackson, or renders with `toKotlinValue`, spreads
 * this list into its entry's `projections`.
 */
export const kotlinJacksonProjections: readonly DeclaredProjection[] = [KotlinProjection]

export const kotlinJacksonEntry = toModelEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  projections: kotlinJacksonProjections,
  transform({ context, ref }) {
    context.insertModel(KotlinProjection, ref)
  },
})
