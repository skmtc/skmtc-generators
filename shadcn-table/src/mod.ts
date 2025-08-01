import { toOperationEntry } from '@skmtc/core'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import { isListResponse } from '@skmtc/tanstack-query-zod'
import { ShadcnTable } from './ShadcnTable.ts'

export const ShadcnTableEntry = toOperationEntry<EnrichmentSchema>({
  id: ShadcnTable.id,

  toEnrichmentSchema,

  isSupported: ({ operation }) => operation.method === 'get' && isListResponse(operation),

  transform: ({ context, operation }) => {
    context.insertOperation(ShadcnTable, operation)
  },

  toPreviewModule: ({ operation }) => ({
    name: ShadcnTable.toIdentifier(operation).name,
    exportPath: ShadcnTable.toExportPath(operation),
    group: 'tables'
  })
})
