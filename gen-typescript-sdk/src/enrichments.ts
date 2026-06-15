import * as v from 'valibot'

/**
 * Per-operation enrichment (subject scope, keyed
 * `[id][path][method][variant]`). The two facts Stainless's private config
 * encodes that an OpenAPI document cannot express on its own:
 *
 * - `resource` — the dotted resource path the operation's method lands on
 *   (`'models'`, `'chat.completions'`, `'fine_tuning.jobs.checkpoints'`).
 *   The resource *tree* is derived from the union of these across every
 *   operation; the class name is the last segment, PascalCased.
 * - `methodName` — the method name on the resource class (`'retrieve'`,
 *   `'list'`, `'create'`, `'delete'`, or a custom verb like `'cancel'`).
 *
 * `resourceDescription` is the resource-level JSDoc rendered above the
 * `export class` — a resource fact, so any operation of the resource may
 * carry it (the accumulator takes the first non-empty one).
 */
const subjectEnrichmentSchema = v.optional(
  v.object({
    resource: v.string(),
    methodName: v.string(),
    resourceDescription: v.optional(v.string())
  })
)

/**
 * Run-constant config for the whole SDK (generator scope, keyed
 * `[id]._generator`).
 *
 * - `clientName` — the top-level client class (`'OpenAI'`).
 * - `schemaNames` — component-schema rename map (`DeleteModelResponse` →
 *   `ModelDeleted`), the Stainless model renames the spec doesn't carry.
 */
const generatorEnrichmentSchema = v.optional(
  v.object({
    clientName: v.optional(v.string()),
    schemaNames: v.optional(v.record(v.string(), v.string()))
  })
)

/**
 * The composite enrichment umbrella `gen-typescript-sdk` reads. `subject`
 * is per-operation; `generator` is the run-constant SDK config; `stack` is
 * unused.
 */
export const sdkEnrichmentSchema = v.object({
  subject: subjectEnrichmentSchema,
  generator: generatorEnrichmentSchema,
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof sdkEnrichmentSchema>

export const toEnrichmentSchema = (): typeof sdkEnrichmentSchema => sdkEnrichmentSchema
