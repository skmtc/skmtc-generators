import * as v from 'valibot'
import { isKtIdentifierName, ktHardKeywords } from '@skmtc/lang-kotlin'

/** Every dotted segment is a valid, non-keyword Kotlin package part. */
const isKotlinPackage = (value: string): boolean =>
  value.split('.').every(segment => isKtIdentifierName(segment) && !ktHardKeywords.has(segment))

/**
 * The subject-scoped leaf — the per-operation method rename (spec 28):
 * `enrichments[id][path][method].main.serviceMethodName` renames BOTH the
 * service-seam signature and the controller delegation in lockstep.
 */
export const springOperationSchema = v.optional(
  v.object({ serviceMethodName: v.optional(v.string()) })
)

/**
 * The `generator`-scope config (`client.json#enrichments[id]._generator`):
 * `basePackage` (REQUIRED, validated) is where the `<Tag>Api` + `ApiError`
 * files land. May equal or differ from gen-kotlin's basePackage.
 */
export const generatorConfigSchema = v.object({
  basePackage: v.pipe(
    v.string(),
    v.check(
      isKotlinPackage,
      'gen-kotlin-spring: basePackage must be a dot-separated Kotlin package name'
    )
  )
})

export type GeneratorConfig = v.InferOutput<typeof generatorConfigSchema>

/**
 * The three-scope enrichment umbrella (core 0.11 three-tier model).
 * `subject` is the per-operation method rename; `generator` carries the
 * run-constant basePackage; `stack` is unused.
 *
 * `SpringApiMethod` reads the subject rename off the RAW enrichment
 * namespace (accumulator-style, no projection `ContentSettings`); the entry
 * transform reads `generator` via `toGeneratorEnrichment(context, …)`.
 */
export const enrichmentSchema = v.object({
  subject: springOperationSchema,
  generator: generatorConfigSchema,
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>
export const toEnrichmentSchema = () => enrichmentSchema
