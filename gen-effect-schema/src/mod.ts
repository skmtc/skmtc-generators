import { toModelEntry } from '@skmtc/core'
import denoJson from '../deno.json' with { type: 'json' }
import { type EnrichmentSchema, toEnrichmentSchema } from './enrichments.ts'
import { EffectProjection } from './EffectProjection.ts'

export const effectSchemaEntry = toModelEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform({ context, refName, variant }) {
    // The projection registers itself into the barrel; see EffectProjection.
    context.insertModel(EffectProjection, refName, { variant })
  },
})
