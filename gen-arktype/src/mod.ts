import { toModelEntry, type DeclaredProjection } from '@skmtc/core'
import { ArktypeProjection } from './ArktypeProjection.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Every projection class gen-arktype can insert. A generator that inserts from
 * gen-arktype spreads this list into its entry's `projections`.
 */
export const arktypeProjections: readonly DeclaredProjection[] = [ArktypeProjection]

export const arktypeEntry = toModelEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  projections: arktypeProjections,
  transform({ context, ref }) {
    context.insertModel(ArktypeProjection, ref)
  }
})