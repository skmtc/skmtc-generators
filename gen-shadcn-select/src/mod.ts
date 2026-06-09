import { toOasOperationEntry } from '@skmtc/core'
import { typescript } from '@skmtc/lang-typescript'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import { isListResponse } from '@skmtc/gen-tanstack-query-supabase-zod'
import { ShadcnSelectField } from './ShadcnSelectField.ts'
import { ShadcnSelectApiBase } from './base.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ShadcnSelectApiEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  lang: typescript,

  toEnrichmentSchema,

  isSupported: ({ operation }) => operation.method === 'get' && isListResponse(operation),

  transform: ({ context, operation, variant }) => {
    context.insertOperation({ projection: ShadcnSelectField, operation, variant })
  },

  toPreviewModule: ({ context, operation, variant }) => {
    const enrichments = ShadcnSelectApiBase.toEnrichments({ operation, context, variant })
    return {
      name: ShadcnSelectApiBase.toIdentifier({ operation, enrichments, variant }).name,
      exportPath: ShadcnSelectApiBase.toExportPath({ operation, enrichments, variant })
    }
  },

  toMappingModule: ({ context, operation, variant }) => {
    const enrichments = ShadcnSelectField.toEnrichments({ operation, context, variant })
    return {
      name: ShadcnSelectField.toIdentifier({ operation, enrichments, variant }).name,
      exportPath: ShadcnSelectField.toExportPath({ operation, enrichments, variant }),
      schema: 'string'
    }
  }
})
