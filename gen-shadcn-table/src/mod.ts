import { toOperationEntry } from '@skmtc/core'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import { isListResponse } from '@skmtc/gen-tanstack-query-supabase-zod'
import { ShadcnTable } from './ShadcnTable.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnTableEntry = toOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  isSupported: ({ operation }) => {
    return operation.method === 'get' && isListResponse(operation)
  },

  transform: ({ context, operation }) => {
    context.insertOperation(ShadcnTable, operation)
  },

  toPreviewModule: ({ operation }) => ({
    name: ShadcnTable.toIdentifier(operation).name,
    exportPath: ShadcnTable.toExportPath(operation),
    group: 'tables'
  })
})
