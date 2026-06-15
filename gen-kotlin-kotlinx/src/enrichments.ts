import * as v from 'valibot'
import { isKtIdentifierName, ktHardKeywords } from '@skmtc/lang-kotlin'
import { modelEnrichmentSchema } from './modelNames.ts'

/** Every dotted segment is a valid, non-keyword Kotlin package part. */
const isKotlinPackage = (value: string): boolean =>
  value.split('.').every(segment => isKtIdentifierName(segment) && !ktHardKeywords.has(segment))

/**
 * The `generator`-scope config (`client.json#enrichments[id]._generator`):
 * run-constant for this generator. `basePackage` is REQUIRED (no default —
 * a silently-wrong `com.example` helps nobody) and validated as a Kotlin
 * package name; the export path encodes it (`@/<dirs>/<Name>.generated.kt`).
 * `scalars` maps OpenAPI `format` keys to Kotlin types, merged over the
 * built-in defaults (a dotted value wires its own import).
 *
 * The value layer (`KtString`, `KtJsonValues`) reads this off `context` via
 * `toGeneratorEnrichment`. It lives here, with the umbrella, for
 * consistency — the cycle that would create (the value layer is upstream of
 * `base.ts`, which imports this) is broken by keeping `modelNames.ts`
 * base-free (it owns `toKtModelName`).
 */
export const generatorConfigSchema = v.object({
  basePackage: v.pipe(
    v.string(),
    v.check(
      isKotlinPackage,
      'gen-kotlin-kotlinx: basePackage must be a dot-separated Kotlin package name'
    )
  ),
  scalars: v.optional(v.record(v.string(), v.string()))
})

export type GeneratorConfig = v.InferOutput<typeof generatorConfigSchema>

/**
 * The three-scope enrichment umbrella (core 0.11 three-tier model).
 * `subject` is the per-model `main.name` rename (declared in
 * `modelNames.ts`); `generator` carries the run-constant config; `stack` is
 * unused.
 *
 * `static toEnrichments` on the projection base assembles the raw umbrella
 * from `[id][refName][variant]` (subject) and `[id]._generator` (generator)
 * and parses it through this schema, so `this.settings.enrichments` (and the
 * static callbacks' `enrichments` arg) carry the typed, core-loaded config.
 */
export const enrichmentSchema = v.object({
  subject: modelEnrichmentSchema,
  generator: generatorConfigSchema,
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>
export const toEnrichmentSchema = () => enrichmentSchema
