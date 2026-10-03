import { toOasOperationEntry } from '@skmtc/core'
import denoJson from '../deno.json' with { type: 'json' }
import { type EnrichmentSchema, toEnrichmentSchema } from './enrichments.ts'
import { EffectEndpoint } from './EffectEndpoint.ts'

export const effectHttpEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform({ context, operation, variant }) {
    // The projection registers itself and its co-located schemas into the
    // barrel; see EffectEndpoint.
    context.insertOperation({ projection: EffectEndpoint, operation, variant })
  },
  // A project scopes a large document with `include` to the endpoints it
  // calls, so the only capability question is the method.
  isSupported({ operation }) {
    return ['get', 'post', 'put', 'patch', 'delete'].includes(operation.method)
  },
})
