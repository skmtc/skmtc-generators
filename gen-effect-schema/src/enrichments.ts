import * as v from 'valibot'
import { sanitizeIdentifier } from '@skmtc/lang-typescript'

/**
 * Generator-scoped, at `skmtc.config.json#settings.enrichments[id]._generator`:
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

/**
 * Subject-scoped, at `skmtc.config.json#settings.enrichments[id][model][variant]`,
 * where `model` is a component's name, or a whole pointer
 * (`#/components/schemas/A/properties/disk`) with no percent escapes:
 * `#/paths/~1x~1{id}/…`, not `#/paths/~1x~1%7Bid%7D/…`:
 *
 * - `name`: the model's identifier, in place of the one made from `refName`.
 *   Two models whose default names are the same fail the run with
 *   `Registered definition mismatch`; name one of them here.
 */
export const subjectSchema = v.optional(
  v.object({
    name: v.optional(
      v.pipe(
        v.string(),
        v.check(
          name => sanitizeIdentifier(name) === name,
          issue => `gen-effect-schema: name '${issue.input}' is not a valid identifier`
        )
      )
    )
  })
)

// The coerced reading of a model is asked for by the caller through the
// projection's options (see options.ts), not configured per subject.
export const effectEnrichmentSchema = v.object({
  subject: subjectSchema,
  generator: generatorSchema,
  stack: v.undefined(),
})

export type EnrichmentSchema = v.InferOutput<typeof effectEnrichmentSchema>

export const toEnrichmentSchema = () => effectEnrichmentSchema
