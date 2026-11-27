import * as v from 'valibot'
import { sanitizeIdentifier } from '@skmtc/lang-typescript'

/**
 * Generator-scoped, at `skmtc.config.json#settings.enrichments[id]._generator`:
 *
 * - `applyDefaults`: render a schema's `default` as `.default(value)`. Off
 *   unless set, and the output is then as it was before the setting. The
 *   key is optional on the input of the schema and always present on its
 *   output, so `z.infer` is narrower than gen-typescript's type, which
 *   stays as it is. Where each key with a default is optional, the type
 *   equals `z.input`.
 */
export const generatorSchema = v.optional(
  v.object({
    applyDefaults: v.optional(v.boolean())
  })
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
          issue => `gen-zod: name '${issue.input}' is not a valid identifier`
        )
      )
    )
  })
)

export const enrichmentSchema = v.object({
  subject: subjectSchema,
  generator: generatorSchema,
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>

export const toEnrichmentSchema = () => enrichmentSchema
