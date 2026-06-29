import * as v from 'valibot'

/**
 * Per-ref enrichment (subject scope, keyed `[id][refName][variant]`).
 *
 * - `name` overrides the generated identifier name for this ref — a model
 *   rename. Applied in `toIdentifierName`, so it flows to the Definition
 *   name, the export path, and **every** cross-reference automatically.
 * - `exportPath` overrides where this ref's type is emitted. Pointing it at
 *   a resource file co-locates the type there; any *other* file that
 *   references the ref then gets a cross-file import automatically (the
 *   Driver registers one whenever the model's export path differs from the
 *   caller's).
 */
const subjectEnrichmentSchema = v.optional(
  v.object({
    name: v.optional(v.string()),
    exportPath: v.optional(v.string())
  })
)

export const typescriptEnrichmentSchema = v.object({
  subject: subjectEnrichmentSchema,
  generator: v.undefined(),
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof typescriptEnrichmentSchema>

export const toEnrichmentSchema = (): typeof typescriptEnrichmentSchema => typescriptEnrichmentSchema
