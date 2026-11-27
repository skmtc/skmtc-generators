import { toOasOperationEntry, type DeclaredProjection } from '@skmtc/core'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import { isListResponse, tanstackQueryProjections } from '@skmtc/gen-tanstack-query-supabase-zod'
import { typescriptProjections } from '@skmtc/gen-typescript'
import { ShadcnTable } from './ShadcnTable.ts'
import { TanstackColumns } from './TanstackColumns.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Every projection class gen-shadcn-table can insert: its own, and those of
 * the generators it inserts from.
 */
export const shadcnTableProjections: readonly DeclaredProjection[] = [
  ShadcnTable,
  TanstackColumns,
  ...tanstackQueryProjections,
  ...typescriptProjections
]

export const ShadcnTableEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  projections: shadcnTableProjections,

  isSupported: ({ operation }) => {
    return operation.method === 'get' && isListResponse(operation)
  },

  transform: ({ context, operation, variant }) => {
    context.insertOperation({ projection: ShadcnTable, operation, variant })
  },

  toPreviewModule: ({ context, operation, variant }) => {
    const enrichments = ShadcnTable.toEnrichments({ operation, context, variant })
    return {
      name: ShadcnTable.toIdentifierName({ operation, enrichments, variant }),
      exportPath: ShadcnTable.toExportPath({ operation, enrichments, variant })
    }
  }
})
