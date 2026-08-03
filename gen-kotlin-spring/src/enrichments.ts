import { type EmptyEnrichments, emptyEnrichmentSchema } from '@skmtc/core'

// SLOT(enrichments): the opt-out. The controller package is FIXED for
// this generator (see API_PACKAGE in lib.ts) and the models package
// belongs to the peer, so there is nothing to configure. Must stay a
// FUNCTION returning the schema — required in both the entry config and
// the base-factory config.
export const toEnrichmentSchema = () => emptyEnrichmentSchema

export type EnrichmentSchema = EmptyEnrichments
