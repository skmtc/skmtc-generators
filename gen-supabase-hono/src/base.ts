import { toTsOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toFirstSegment } from './toFirstSegment.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const SupabaseHonoBase = toTsOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toIdentifierName(): string {
    return 'app'
  },

  toIdentifierType: () => ({ type: 'variable' }),

  toExportPath({ operation, enrichments }): string {
    const firstSegment = toFirstSegment(operation)

    return join('@', `${firstSegment}`, `api.generated.ts`)
  },

  toEnrichmentSchema
})
