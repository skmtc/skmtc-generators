import { toOasOperationEntry } from '@skmtc/core'
import { typescript } from '@skmtc/lang-typescript'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import { isListResponse } from '@skmtc/gen-tanstack-query-supabase-zod'
import { ShadcnTable } from './ShadcnTable.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnTableEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  lang: typescript,

  toEnrichmentSchema,

  isSupported: ({ operation }) => {
    return operation.method === 'get' && isListResponse(operation)
  },

  transform: ({ context, operation, variant }) => {
    context.insertOperation({ projection: ShadcnTable, operation, variant })
  },

  toPreviewModule: ({ context, operation, variant }) => {
    const enrichments = ShadcnTable.toEnrichments({ operation, context, variant })
    return {
      name: ShadcnTable.toIdentifier({ operation, enrichments, variant }).name,
      exportPath: ShadcnTable.toExportPath({ operation, enrichments, variant })
    }
  }
})
