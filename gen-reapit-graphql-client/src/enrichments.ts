import { emptyEnrichmentSchema, type EmptyEnrichments } from '@skmtc/core'

// Reserved for future overrides — explicit selection sets, custom
// queryKey shapes, etc. Empty for v1 because the generator infers
// everything from the operation's return type using a fixed shape
// (see ReapitGraphqlClient).
export const toEnrichmentSchema = () => emptyEnrichmentSchema

export type EnrichmentSchema = EmptyEnrichments
