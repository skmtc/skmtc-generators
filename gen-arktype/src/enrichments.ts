import * as v from 'valibot'
import { sanitizeIdentifier } from '@skmtc/lang-typescript'

/**
 * Subject-scoped, at `client.json#settings.enrichments[id][model][variant]`,
 * where `model` is a component's name, or a whole pointer
 * (`#/components/schemas/A/properties/disk`):
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
          issue => `gen-arktype: name '${issue.input}' is not a valid identifier`
        )
      )
    )
  })
)

export const enrichmentSchema = v.object({
  subject: subjectSchema,
  generator: v.undefined(),
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>

export const toEnrichmentSchema = () => enrichmentSchema
