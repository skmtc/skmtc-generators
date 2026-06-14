import { emptyEnrichmentSchema, type EmptyEnrichments } from '@skmtc/core'

// No per-operation overrides yet — every supported query gets a vanilla
// id/name lookup. Reserved for future use (e.g. customizing the search
// argument name when it isn't `name`, or selecting a different label
// field on the row type).
export const toEnrichmentSchema = () => emptyEnrichmentSchema

export type EnrichmentSchema = EmptyEnrichments
