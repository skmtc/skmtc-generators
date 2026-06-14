import { toTsOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toFirstSegment } from './toFirstSegment.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ExpressAppBase = toTsOasOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toIdentifierName(): string {
    return 'app'
  },

  toIdentifierType: () => ({ kind: 'variable' }),

  toExportPath({ operation, enrichments }): string {
    const firstSegment = toFirstSegment(operation)

    return join('@', `${firstSegment}`, `routes.generated.ts`)
  },

  toEnrichmentSchema
})
