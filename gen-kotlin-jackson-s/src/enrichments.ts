import { emptyEnrichmentSchema, type EmptyEnrichments } from '@skmtc/core'

// gen-kotlin-jackson-s reads no per-subject enrichments — its model
// identity (basePackage / clientPrefix / artifactName / ModelConfig)
// comes from `src/settings.json`, not the enrichment scope. The empty
// umbrella keeps `generator` / `stack` as `v.undefined()`; migrating the
// JSON config to the `_generator` enrichment tier is a separate follow-up.
export const toEnrichmentSchema = () => emptyEnrichmentSchema

export type EnrichmentSchema = EmptyEnrichments
