import * as v from 'valibot'
import { isKtIdentifierName, ktHardKeywords } from '@skmtc/lang-kotlin'

/** Every dotted segment is a valid, non-keyword Kotlin package part. */
const isKotlinPackage = (value: string): boolean =>
  value.split('.').every((segment) => isKtIdentifierName(segment) && !ktHardKeywords.has(segment))

/**
 * The `generator`-scope config (`client.json#enrichments[id]._generator`):
 * `basePackage` (REQUIRED, validated, no default) is the Kotlin package
 * every model — component-derived and synthesized alike — lands in. A
 * placeholder default would ship reserved-for-documentation space
 * (`com.example.*`) into consumer code, so there is none: configuring
 * the package is part of adopting the generator (the same policy as
 * gen-kotlin-spring's own basePackage).
 */
export const generatorConfigSchema = v.object({
  basePackage: v.pipe(
    v.string(),
    v.check(
      isKotlinPackage,
      'gen-kotlin-jackson: basePackage must be a dot-separated Kotlin package name',
    ),
  ),
})

export type GeneratorConfig = v.InferOutput<typeof generatorConfigSchema>

/**
 * SLOT(enrichments): the three-scope umbrella. Only the `generator`
 * scope is read; there is no per-model configuration. Must stay a
 * FUNCTION returning the schema.
 */
export const enrichmentSchema = v.object({
  subject: v.optional(v.undefined()),
  generator: generatorConfigSchema,
  stack: v.optional(v.undefined()),
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>

export const toEnrichmentSchema = () => enrichmentSchema
