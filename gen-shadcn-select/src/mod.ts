import { toOasOperationEntry } from '@skmtc/core'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import { isListResponse } from '@skmtc/gen-tanstack-query-supabase-zod'
import { ShadcnSelectField } from './ShadcnSelectField.ts'
import { ShadcnSelectApiBase } from './base.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnSelectApiEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  isSupported: ({ operation }) => operation.method === 'get' && isListResponse(operation),

  transform: ({ context, operation }) => {
    context.insertOperation({ projection: ShadcnSelectField, operation: operation })
  },

  toPreviewModule: ({ context, operation }) => {
    const enrichments = ShadcnSelectApiBase.toEnrichments({ operation, context })
    return {
      name: ShadcnSelectApiBase.toIdentifier({ operation, enrichments }).name,
      exportPath: ShadcnSelectApiBase.toExportPath({ operation, enrichments })
    }
  },

  toMappingModule: ({ context, operation }) => {
    const enrichments = ShadcnSelectField.toEnrichments({ operation, context })
    return {
      name: ShadcnSelectField.toIdentifier({ operation, enrichments }).name,
      exportPath: ShadcnSelectField.toExportPath({ operation, enrichments }),
      schema: 'string'
    }
  }
})
