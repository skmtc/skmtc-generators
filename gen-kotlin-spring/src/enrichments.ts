import * as v from 'valibot'

/**
 * The subject-scoped leaf — the per-operation method rename (spec 28):
 * `enrichments[id][path][method].main.serviceMethodName` renames BOTH the
 * service-seam signature and the controller delegation in lockstep.
 */
export const springOperationSchema = v.optional(
  v.object({ serviceMethodName: v.optional(v.string()) })
)

/**
 * The three-scope enrichment umbrella (core 0.11 three-tier model).
 * gen-kotlin-spring only consumes the SUBJECT scope; `generator` and
 * `stack` are unused (declared `v.undefined()`).
 *
 * `SpringApiMethod` reads the rename off the RAW enrichment namespace
 * (`context.settings.enrichments[id][path][method].main`) — an
 * accumulator-style generator with no projection `ContentSettings` to
 * carry the parsed umbrella — so this schema only declares the shape the
 * entry's `toEnrichmentSchema` requires.
 */
export const enrichmentSchema = v.object({
  subject: springOperationSchema,
  generator: v.undefined(),
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>
export const toEnrichmentSchema = () => enrichmentSchema
