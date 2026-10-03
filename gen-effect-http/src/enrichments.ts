import { type EmptyEnrichments, emptyEnrichmentSchema } from '@skmtc/core'

// No configuration: the output folder is fixed in base.ts, and a project
// scopes the endpoints it wants with `client.json#settings.include`.
export const toEnrichmentSchema = () => emptyEnrichmentSchema

export type EnrichmentSchema = EmptyEnrichments
