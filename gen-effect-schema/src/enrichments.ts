import * as v from 'valibot'

/**
 * Generator-scoped, at `client.json#settings.enrichments[id]._generator`:
 *
 * - `defaults`: render a schema's `default` as a decoding default. Off
 *   unless set: some published documents carry defaults that are not
 *   values of their own schema (`{}` on a struct with a required key,
 *   `["web"]` on a list of objects), and such a document is usually only
 *   decoded, never built from.
 */
export const generatorSchema = v.optional(
  v.object({
    defaults: v.optional(v.boolean()),
  }),
)

// No subject scope: the coerced reading of a model is asked for by the
// caller through the projection's options (see options.ts), not
// configured per subject.
export const effectEnrichmentSchema = v.object({
  subject: v.undefined(),
  generator: generatorSchema,
  stack: v.undefined(),
})

export type EnrichmentSchema = v.InferOutput<typeof effectEnrichmentSchema>

export const toEnrichmentSchema = () => effectEnrichmentSchema
