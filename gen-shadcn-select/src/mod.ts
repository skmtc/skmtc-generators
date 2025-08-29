import { toOperationEntry } from '@skmtc/core'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import { isListResponse } from '@skmtc/gen-tanstack-query-supabase-zod'
import { ShadcnSelectField } from './ShadcnSelectField.ts'
import { ShadcnSelectApiBase } from './base.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnSelectApiEntry = toOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  isSupported: ({ operation }) => operation.method === 'get' && isListResponse(operation),

  transform: ({ context, operation }) => {
    context.insertOperation(ShadcnSelectField, operation)
  },

  toPreviewModule: ({ operation }) => ({
    name: ShadcnSelectApiBase.toIdentifier(operation).name,
    exportPath: ShadcnSelectApiBase.toExportPath(operation),
    group: 'inputs'
  }),

  toMappingModule: ({ operation }) => ({
    name: ShadcnSelectField.toIdentifier(operation).name,
    exportPath: ShadcnSelectField.toExportPath(operation),
    group: 'inputs',
    itemType: 'input',
    schema: 'string'
  })
})
