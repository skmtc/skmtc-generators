import { decapitalize, camelCase } from '@skmtc/core'
import { toTsModelProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ValibotBase = toTsModelProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toIdentifierName({ refName }): string {
    return decapitalize(camelCase(refName))
  },

  toIdentifierType: () => ({ kind: 'variable' }),

  toExportPath({ refName, enrichments, variant }): string {
    const name = this.toIdentifierName({ refName, enrichments, variant })

    return join('@', 'types', `${decapitalize(name)}.generated.ts`)
  },

  toEnrichmentSchema
})