import { toOasOperationEntry } from '@skmtc/core'
import { FetchProjection } from './FetchProjection.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const fetchEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform: ({ context, operation, variant }) => {
    context.insertOperation({ projection: FetchProjection, operation, variant })
  }
})
