import * as v from 'valibot'

// Reserved for future use (e.g. customizing the page size used to fetch
// the full option list). Today every supported query gets a vanilla
// id/name multi-select with pageSize=1000.
export const enrichmentSchema = v.optional(v.object({}))

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>

export const toEnrichmentSchema = () => enrichmentSchema
