import { toOasOperationEntry, type DeclaredProjection } from '@skmtc/core'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import { isListResponse, tanstackQueryProjections } from '@skmtc/gen-tanstack-query-supabase-zod'
import { typescriptProjections } from '@skmtc/gen-typescript'
import { ShadcnSelectField } from './ShadcnSelectField.ts'
import { ShadcnSelectInput } from './ShadcnSelectInput.ts'
import { ShadcnSelectApiBase } from './base.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Every projection class gen-shadcn-select can insert: its own, and those of
 * the generators it inserts from.
 */
export const shadcnSelectProjections: readonly DeclaredProjection[] = [
  ShadcnSelectField,
  ShadcnSelectInput,
  ...tanstackQueryProjections,
  ...typescriptProjections
]

export const ShadcnSelectApiEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  projections: shadcnSelectProjections,

  isSupported: ({ operation }) => operation.method === 'get' && isListResponse(operation),

  transform: ({ context, operation, variant }) => {
    context.insertOperation({ projection: ShadcnSelectField, operation, variant })
  },

  toPreviewModule: ({ context, operation, variant }) => {
    const enrichments = ShadcnSelectApiBase.toEnrichments({ operation, context, variant })
    return {
      name: ShadcnSelectApiBase.toIdentifierName({ operation, enrichments, variant }),
      exportPath: ShadcnSelectApiBase.toExportPath({ operation, enrichments, variant })
    }
  }
})
