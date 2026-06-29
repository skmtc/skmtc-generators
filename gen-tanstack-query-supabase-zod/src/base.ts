import { capitalize, toEndpointName } from '@skmtc/core'
import { toTsOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const TanstackQueryBase = toTsOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toIdentifierName({ operation }): string {
    return `use${capitalize(toEndpointName(operation))}`
  },

  toIdentifierType: () => ({ type: 'variable' }),

  toExportPath({ operation, enrichments, variant }): string {
    const name = this.toIdentifierName({ operation, enrichments, variant })

    return join('@', 'services', `${name}.generated.ts`)
  },

  toEnrichmentSchema
})
