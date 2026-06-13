import { capitalize } from '@skmtc/core'
import { toGqlOperationProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Identifier convention:
 *   Query.GetOffices    → useGetOffices
 *   Mutation.CreateContact → useCreateContact
 *   Mutation.UpdateContact → useUpdateContact
 *
 * The hook name doesn't encode the rootKind because GraphQL keeps query
 * and mutation field names in disjoint namespaces — collisions are
 * rare in practice and an enrichment can disambiguate if they ever
 * happen.
 *
 * Export path is `@/services/graphql/<hookName>.generated.ts`. Each
 * hook lives in its own file so a consumer that only needs one query
 * doesn't pay for unused imports under tree-shaking.
 */
export const ReapitGraphqlClientBase = toGqlOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifierName({ operation }): string {
    return `use${capitalize(operation.fieldName)}`
  },

  toIdentifierType: () => ({ kind: 'variable' }),

  toExportPath({ operation, enrichments, variant }): string {
    const name = this.toIdentifierName({ operation, enrichments, variant })
    return join('@', 'services', 'graphql', `${name}.generated.ts`)
  }
})
