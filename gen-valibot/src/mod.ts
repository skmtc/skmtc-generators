import { toModelEntry } from '@skmtc/core'
import { ValibotProjection } from './ValibotProjection.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const valibotEntry = toModelEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform({ context, refName }) {
    context.insertModel(ValibotProjection, refName)
  }
})