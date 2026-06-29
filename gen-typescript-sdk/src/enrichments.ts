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
 *
 * `paginated` — whether the method is a `getAPIList`/`PagePromise` (vs a plain
 * `APIPromise`). A list-shaped `{ object: 'list', data: [] }` response does NOT
 * imply pagination (e.g. `embeddings.create` returns that shape but is a `post`),
 * so the truth comes from the SDK config, not a response-shape heuristic.
 */
const subjectEnrichmentSchema = v.optional(
  v.object({
    resource: v.string(),
    methodName: v.string(),
    resourceDescription: v.optional(v.string()),
    paginated: v.optional(v.boolean())
  })
)

/**
 * Run-constant config for the whole SDK (generator scope, keyed
 * `[id]._generator`).
 *
 * - `clientName` — the top-level client class (`'OpenAI'`).
 * - `fileHeader` — a banner comment emitted at the top of every generated
 *   resource file (the Stainless codegen header).
 *
 * (Model renames are NOT here — they're per-ref `name` enrichments on
 * `@skmtc/gen-typescript-s`, applied via its `toIdentifierName`.)
 */
const generatorEnrichmentSchema = v.optional(
  v.object({
    clientName: v.optional(v.string()),
    fileHeader: v.optional(v.string())
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
