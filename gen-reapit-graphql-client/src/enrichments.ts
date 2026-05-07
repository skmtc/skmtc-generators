import * as v from 'valibot'

// Reserved for future overrides — explicit selection sets, custom
// queryKey shapes, etc. Empty for v1 because the generator infers
// everything from the operation's return type using a fixed shape
// (see ReapitGraphqlClient).
export const enrichmentSchema = v.optional(v.object({}))

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>

export const toEnrichmentSchema = () => enrichmentSchema
