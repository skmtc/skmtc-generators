import { capitalize, decapitalize, camelCase } from '@skmtc/core'
import { toTsModelProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const TypescriptBase = toTsModelProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  // The `name` subject enrichment renames a ref; applied here so the new
  // name flows to the Definition, the export path, and every cross-reference.
  toIdentifierName({ refName, enrichments }): string {
    return enrichments.subject?.name ?? capitalize(camelCase(refName))
  },

  toIdentifierType: () => ({ kind: 'type' }),

  toExportPath({ refName, enrichments, variant }): string {
    const name = this.toIdentifierName({ refName, enrichments, variant })

    return join('@', 'types', `${decapitalize(name)}.generated.ts`)
  },

  toEnrichmentSchema
})
