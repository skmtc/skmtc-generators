import * as v from 'valibot'
import { toStackEnrichment } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'

/**
 * The model layer's config slice — the fields the Jackson/Stainless model
 * engine needs to shape its output (basePackage / clientPrefix / artifactName
 * for naming + paths; the per-corpus field transforms; the response envelope).
 *
 * It is read from the **stack** enrichment scope (`client.json#settings`
 * `enrichments._stack`) rather than a baked-in JSON file: the engine is a
 * shared component (used standalone AND embedded in `gen-kotlin-sdk` by
 * import-and-construct), so its config must be reachable WITHOUT knowing which
 * generator id is driving it. `_stack` is the only id-agnostic scope. The
 * SDK's full `SdkConfig` is a structural superset written to the same `_stack`
 * blob; Valibot's `v.object` drops the SDK-only keys when read through this
 * subset schema, so one `_stack` leaf serves both readers.
 */
export const modelConfigSchema = v.object({
  basePackage: v.string(),
  clientPrefix: v.string(),
  artifactName: v.string(),
  /** The attribution comment every generated file carries above its package
   * directive (target-specific — e.g. `// File generated … by Stainless.`). */
  fileHeader: v.string(),
  hoistField: v.optional(v.string()),
  kotlinNames: v.optional(v.record(v.string(), v.string())),
  fieldStates: v.optional(v.record(v.string(), v.picklist(['required-nullable']))),
  fieldEnums: v.optional(v.record(v.string(), v.array(v.string()))),
  sharedModels: v.object({
    envelope: v.optional(
      v.object({
        className: v.string(),
        fields: v.array(v.string()),
        source: v.object({ path: v.string(), method: v.string() })
      })
    )
  })
})

export type ModelConfig = v.InferOutput<typeof modelConfigSchema>

/**
 * Read the model config from the run's `_stack` enrichment. The throw on a
 * missing/malformed `_stack` is intentional — the engine cannot name or place
 * a single class without `basePackage` / `artifactName`, so a run without it
 * is a configuration error, surfaced loudly (fail-open per item, like any bad
 * enrichment leaf).
 */
export const getModelConfig = (context: GenerateContextType): ModelConfig =>
  toStackEnrichment(context, modelConfigSchema)
