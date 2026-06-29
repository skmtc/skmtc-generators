import { toGqlOperationEntry, type IsSupportedGqlOperationArgs } from '@skmtc/core'
import { ReapitGraphqlClient } from './ReapitGraphqlClient.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * gen-reapit-graphql-client: emits one React Query hook per GraphQL
 * Query / Mutation operation, wrapping `graphql-request` for transport
 * and `@graphql-typed-document-node/core` for the type contract.
 *
 *   Query.GetOffices     → useGetOffices() returning useQuery<...>
 *   Mutation.CreateContact → useCreateContact() returning useMutation<...>
 *
 * Output is a self-contained `.generated.ts` per operation:
 *   - Variables type (synthesized from operation.arguments)
 *   - Result type (TS Projection on operation.returnType)
 *   - TypedDocumentNode constant (string cast)
 *   - The hook itself
 *
 * `isSupported` is broad — every Query and Mutation in the schema gets a
 * hook. Mirrors the canonical `gen-tanstack-query-supabase-zod` pattern:
 * generators are cheap, consumers tree-shake what they don't use, and
 * narrow scoping requires every consumer to call `insertOperation`
 * themselves — friction without saving meaningful work.
 */
export const reapitGraphqlClientEntry = toGqlOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  isSupported({ operation }: IsSupportedGqlOperationArgs): boolean {
    return operation.rootKind === 'query' || operation.rootKind === 'mutation'
  },

  transform({ context, operation }) {
    if (operation.rootKind !== 'query' && operation.rootKind !== 'mutation') return
    context.insertOperation({ projection: ReapitGraphqlClient, operation })
  },

  toEnrichmentSchema
})
