import * as v from 'valibot'

/**
 * Per-ref enrichment (subject scope, keyed `[id][refName][variant]`).
 *
 * `name` overrides the generated identifier name for this ref — a model
 * rename. Applied in `toIdentifierName`, so it flows to the Definition name,
 * the export path, and **every** cross-reference automatically (the engine
 * resolves all of them through `toIdentifierName`).
 */
const subjectEnrichmentSchema = v.optional(
  v.object({
    name: v.optional(v.string())
  })
)

export const typescriptEnrichmentSchema = v.object({
  subject: subjectEnrichmentSchema,
  generator: v.undefined(),
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof typescriptEnrichmentSchema>

export const toEnrichmentSchema = (): typeof typescriptEnrichmentSchema => typescriptEnrichmentSchema
