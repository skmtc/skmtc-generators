import * as v from 'valibot'
import { modelEnrichmentSchema } from './modelNames.ts'

/**
 * The three-scope enrichment umbrella (core 0.11 three-tier model).
 * gen-kotlin-kotlinx only consumes the SUBJECT scope — the per-model
 * `main.name` rename leaf declared in `modelNames.ts`. `generator` and
 * `stack` are unused (declared `v.undefined()`).
 *
 * `static toEnrichments` on the projection base assembles the raw
 * umbrella from `[id][refName][variant]` (subject) and parses it through
 * this schema, so `this.settings.enrichments.subject` is the per-model
 * rename and the base callbacks read `enrichments?.subject?.name`.
 */
export const enrichmentSchema = v.object({
  subject: modelEnrichmentSchema,
  generator: v.undefined(),
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>
export const toEnrichmentSchema = () => enrichmentSchema
