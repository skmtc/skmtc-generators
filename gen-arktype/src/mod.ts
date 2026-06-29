import { toModelEntry } from '@skmtc/core'
import { ArktypeProjection } from './ArktypeProjection.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const arktypeEntry = toModelEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform({ context, refName }) {
    context.insertModel(ArktypeProjection, refName)
  }
})