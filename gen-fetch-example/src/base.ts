import { decapitalize, toEndpointName } from '@skmtc/core'
import { toTsOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const FetchBase = toTsOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toIdentifierName({ operation }): string {
    return decapitalize(toEndpointName(operation))
  },

  toIdentifierType: () => ({ type: 'variable' }),

  // Calls FetchBase by name: `this` is the bound config, never a projection override.
  // Keep the `: string` return type, or the self-reference is circular (TS7022).
  toExportPath({ operation, enrichments, variant }): string {
    const name = FetchBase.toIdentifierName({ operation, enrichments, variant })

    return `@/fetch/${name}.generated.ts`
  },

  toEnrichmentSchema
})
