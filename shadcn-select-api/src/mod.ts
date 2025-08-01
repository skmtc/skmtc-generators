import { toOperationEntry } from '@skmtc/core'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import { isListResponse } from '@skmtc/tanstack-query-zod'
import { ShadcnSelectField } from './ShadcnSelectField.ts'
import { ShadcnSelectApiBase } from './base.ts'

export const ShadcnSelectApiEntry = toOperationEntry<EnrichmentSchema>({
  id: '@skmtc/shadcn-select-api',

  toEnrichmentSchema,

  isSupported: ({ operation }) => operation.method === 'get' && isListResponse(operation),

  transform: ({ context, operation }) => {
    context.insertOperation(ShadcnSelectField, operation)
  },

  toPreviewModule: ({ operation }) => ({
    name: ShadcnSelectApiBase.toIdentifier(operation).name,
    exportPath: ShadcnSelectApiBase.toExportPath(operation),
    group: 'inputs'
  })
})
