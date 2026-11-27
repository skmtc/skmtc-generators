import { TanstackQuery } from './TanstackQuery.ts'
import { toOasOperationEntry, type DeclaredProjection } from '@skmtc/core'
import { typescriptProjections } from '@skmtc/gen-typescript'
import { zodProjections } from '@skmtc/gen-zod'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Every projection class gen-tanstack-query-supabase-zod can insert: its
 * own, and those of gen-zod and gen-typescript, for the schemas and types of
 * an operation. A generator that inserts `TanstackQuery` spreads this list
 * into its entry's `projections`.
 */
export const tanstackQueryProjections: readonly DeclaredProjection[] = [
  TanstackQuery,
  ...zodProjections,
  ...typescriptProjections
]

export const tanstackQueryEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  projections: tanstackQueryProjections,
  transform: ({ context, operation }) => {
    context.insertOperation({ projection: TanstackQuery, operation: operation })
  },
  isSupported({ operation }) {
    if (['get', 'delete'].includes(operation.method)) {
      return true
    }

    if (['post', 'put', 'patch'].includes(operation.method)) {
      return Boolean(operation.toRequestBody(({ schema }) => schema))
    }

    return false
  }
})
