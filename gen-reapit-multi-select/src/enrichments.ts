import { emptyEnrichmentSchema, type EmptyEnrichments } from '@skmtc/core'

// Reserved for future use (e.g. customizing the page size used to fetch
// the full option list). Today every supported query gets a vanilla
// id/name multi-select with pageSize=1000.
export const toEnrichmentSchema = () => emptyEnrichmentSchema

export type EnrichmentSchema = EmptyEnrichments
