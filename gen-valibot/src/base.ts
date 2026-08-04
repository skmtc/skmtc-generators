import { decapitalize, camelCase } from '@skmtc/core'
import { toTsModelProjectionBase, sanitizeIdentifier } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ValibotBase = toTsModelProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toIdentifierName({ refName }): string {
    return sanitizeIdentifier(decapitalize(camelCase(refName)))
  },

  toIdentifierType: () => ({ type: 'variable' }),

  toExportPath({ refName, enrichments, variant }): string {
    const name = this.toIdentifierName({ refName, enrichments, variant })

    return join('@', 'types', `${decapitalize(name)}.generated.ts`)
  },

  toEnrichmentSchema
})