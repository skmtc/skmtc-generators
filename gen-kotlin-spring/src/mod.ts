import { toOasOperationEntry } from '@skmtc/core'
import denoJson from '../deno.json' with { type: 'json' }
import { type EnrichmentSchema, toEnrichmentSchema } from './enrichments.ts'
import { isSupportedMethod } from './methods.ts'
import { SpringControllerProjection } from './SpringControllerProjection.ts'

export const kotlinSpringServerEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,

  // The filter runs BEFORE the projection is constructed, so an
  // unsupported method (the fixture's `head`) never becomes a subject —
  // no artifact, no error.
  isSupported: ({ operation }) => isSupportedMethod(operation.method),

  transform({ context, operation, variant }) {
    context.insertOperation({ projection: SpringControllerProjection, operation, variant })
  }
})
