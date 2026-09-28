import { decapitalize, camelCase } from '@skmtc/core'
import { toTsModelProjectionBase } from '@skmtc/lang-typescript'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ArktypeBase = toTsModelProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toIdentifierName({ refName }): string {
    return decapitalize(camelCase(refName))
  },

  toIdentifierType: () => ({ type: 'variable' }),

  // Calls ArktypeBase by name: `this` is the bound config, never a projection override.
  // Keep the `: string` return type, or the self-reference is circular (TS7022).
  toExportPath({ refName, enrichments, variant }): string {
    const name = ArktypeBase.toIdentifierName({ refName, enrichments, variant })

    return `@/types/${decapitalize(name)}.generated.ts`
  },

  toEnrichmentSchema
})