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
 * `emitServiceImplementations` (optional, off when absent) adds the
 * `Default<Tag>Service` scaffolds. `basePath` (optional) prefixes every
 * route.
 */
export const generatorConfigSchema = v.object({
  basePackage: v.pipe(
    v.string(),
    v.check(
      isKotlinPackage,
      'gen-kotlin-spring: basePackage must be a dot-separated Kotlin package name'
    )
  ),
  /**
   * The path every route hangs under, rendered as a class-level
   * `@RequestMapping` on each controller — `/api` for a service whose
   * operations answer at `/api/customers`.
   *
   * Stated rather than read from the document's `servers`: that URL says
   * where the API is hosted today, which is a deployment fact and needn't
   * be where this service will run. Asking also avoids guessing between
   * several servers, resolving server variables, and deciding what an
   * unparseable URL means — none of which the document settles.
   *
   * Absent means no prefix, which is right for the common document whose
   * server URL carries no path.
   */
  basePath: v.optional(
    v.pipe(
      v.string(),
      v.check(
        value => value.startsWith('/') && !value.endsWith('/'),
        'gen-kotlin-spring: basePath must start with `/` and must not end with one'
      )
    )
  ),
  /**
   * Emit a `Default<Tag>Service` scaffold beside each `<Tag>Api` — every
   * method throwing 501 — so a large document's implementations do not
   * have to be typed out by hand. OFF by default: the file is a starting
   * point for hand-written code, and turning it on for a project that
   * already has implementations would add a second bean per interface.
   * Eject a scaffold before writing logic into it.
   *
   * Absent reads as off — `v.optional` WITHOUT a valibot default, so the
   * schema's input and output types stay identical (a default makes the
   * key optional on the way in and required on the way out, which the
   * entry's `GenericSchema<EnrichmentType>` slot rejects).
   */
  emitServiceImplementations: v.optional(v.boolean())
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
