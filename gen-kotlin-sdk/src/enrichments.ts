import * as v from 'valibot'

/**
 * Per-operation enrichment — the operation-level half of a Stainless
 * config (note 32 §A4): WHERE the operation sits in the resource tree
 * and WHAT its method is called. Names derive from these (§A2);
 * `classStem` overrides the default `Pascal(resource)` stem where
 * Stainless inflected (`tripDetails` → `TripDetail`) — we encode the
 * result, never an inflection engine.
 */
export const sdkOperationEnrichmentSchema = v.optional(
  v.object({
    /** Path through the resource tree (length 1 on flat APIs). */
    resource: v.array(v.string()),
    /** Configured method name: `retrieve`, `list`, `create`, … */
    method: v.string(),
    /** Class-name stem override (defaults to `Pascal(resource)`). */
    classStem: v.optional(v.string()),
    /**
     * Deprecation message for the Params class `@Deprecated(...)`
     * annotation — config-carried (Stainless aliases name the
     * replacement method). Spec-deprecated operations without a
     * message render `@Deprecated("deprecated")`.
     */
    deprecatedMessage: v.optional(v.string()),
    /**
     * Config-mirrored field injections into the `data`-level model
     * (Stainless configs add fields the spec omits — the corpus
     * `limitExceeded` on agency / arrivals-and-departures-for-location).
     * Inserted at the alphabetical position; state comes from the
     * global `fieldStates`.
     */
    addFields: v.optional(
      v.array(
        v.object({
          wireName: v.string(),
          type: v.picklist(['boolean', 'string', 'integer', 'number'])
        })
      )
    )
  })
)

export type SdkOperationEnrichment = v.InferOutput<typeof sdkOperationEnrichmentSchema>

export const toEnrichmentSchema = () => sdkOperationEnrichmentSchema
