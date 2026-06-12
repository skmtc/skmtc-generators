import * as v from 'valibot'

/**
 * SDK-global identity — the gen-kotlin-sdk counterpart of the
 * document-global half of a Stainless config (note 32 §A4 / Q6).
 *
 * INTERIM mechanism: `src/sdk-config.json` is imported directly by
 * `src/config.ts` and narrowed through this schema. Swaps to the core
 * document-global enrichment tier when that lands. Every field here is
 * evidence for that tier's design.
 *
 * A config field is legitimate iff its comment names BOTH the
 * Stainless-config concept it mirrors AND the corpus evidence that
 * forced it (docs/extending/generator-code-quality.md, Rule 6).
 */
const staticFileSchema = v.object({
  module: v.string(),
  relPath: v.string(),
  header: v.string(),
  imports: v.record(v.string(), v.array(v.string())),
  body: v.string()
})

export const sdkConfigSchema = v.object({
  /** Base Kotlin package (`org.onebusaway`) — also the package directories. */
  basePackage: v.string(),
  /** Client class prefix (`OnebusawaySdk` → `OnebusawaySdkClient`); SCREAM and lower forms derive from it. */
  clientPrefix: v.string(),
  /** Gradle artifact stem (`onebusaway-sdk-kotlin`) — module dirs are `<artifactName>-core` etc. */
  artifactName: v.string(),
  /** GitHub slug (`OneBusAway/kotlin-sdk`) — appears in doc links. */
  repoSlug: v.string(),
  /** Human display name for the client KDoc (`Onebusaway SDK`). */
  displayName: v.string(),
  /** Production base URL baked into ClientOptions. */
  baseUrl: v.string(),
  /** Sandbox base URL (targets with environments — corpus: Lithic ClientOptions). */
  sandboxUrl: v.optional(v.string()),
  /** Webhook secret env var (targets with webhooks — corpus: Lithic). */
  webhookSecretEnvVar: v.optional(v.string()),
  /** API-key auth wiring (the only scheme on the simple target). */
  auth: v.object({
    /** Environment variable the client reads the API key from (`ONEBUSAWAY_API_KEY`). */
    envVar: v.string(),
    /** The client-options property name for the key (`onebusawayApiKey`). */
    propertyName: v.string()
  }),
  /**
   * The §C5 config-asserted shared models: `extracted` replace
   * structurally-identical inline occurrences; the `envelope` is the
   * response-wrapper class each covering response converts to.
   */
  sharedModels: v.object({
    extracted: v.array(
      v.object({
        className: v.string(),
        /** One canonical occurrence: an operation + a `/`-pointer into its response schema. */
        source: v.object({ path: v.string(), method: v.string(), pointer: v.string() })
      })
    ),
    /** Absent on targets without a response envelope (Lithic). */
    envelope: v.optional(
      v.object({
        className: v.string(),
        /** Wire names of the envelope fields, in schema order. */
        fields: v.array(v.string()),
        /** Operation whose response supplies the envelope field types. */
        source: v.object({ path: v.string(), method: v.string() })
      })
    )
  }),
  /**
   * Stainless's models file layout: `by-resource` nests under
   * `models/<resource>/` (corpus: OneBusAway), `flat` keeps every
   * model at the `models/` root (corpus: Lithic). Defaults to
   * `by-resource`.
   */
  modelsLayout: v.optional(v.picklist(['flat', 'by-resource'])),
  /**
   * The Stainless resource primary key — hoists to the front of its
   * ordering group (`id` for OneBusAway, `token` for Lithic; corpus:
   * FinancialTransaction leads with `token`). Defaults to `id`.
   */
  hoistField: v.optional(v.string()),
  /**
   * Stainless `models:` declarations — component refNames with
   * STANDALONE model classes. A request body `$ref` to one renders
   * the named-field shape; other ref bodies nest (corpus:
   * ChallengeResponse standalone vs VoidHoldRequest nested).
   */
  modelComponents: v.optional(v.array(v.string())),
  /**
   * Stainless naming transforms camelCase cannot derive — per-wire-name
   * Kotlin name overrides (corpus: `three_ds_authentication_token` →
   * `threeDSAuthenticationToken`).
   */
  kotlinNames: v.optional(v.record(v.string(), v.string())),
  /**
   * Stainless required/nullable transforms (corpus: `limitExceeded` —
   * fence-listed + required wording, nullable accessor, no
   * `checkRequired`).
   */
  fieldStates: v.optional(v.record(v.string(), v.picklist(['required-nullable']))),
  /**
   * Stainless enum assertions for string fields the spec leaves open
   * (corpus: `Situation.reason` TPEG codes). Keyed by wire name.
   */
  fieldEnums: v.optional(v.record(v.string(), v.array(v.string()))),
  /**
   * Per-target template overlay (corpus harness only — §KS-F F2);
   * product configs omit it.
   */
  staticOverlay: v.optional(v.object({ files: v.array(staticFileSchema) }))
})

export type SdkConfig = v.InferOutput<typeof sdkConfigSchema>
export type SdkAuthConfig = SdkConfig['auth']

/** Narrows a JSON-loaded config — loud on any unknown shape, no casts. */
export const toSdkConfig = (raw: unknown): SdkConfig => v.parse(sdkConfigSchema, raw)

/**
 * `OnebusawaySdk` → `ONEBUSAWAY_SDK` (the env-var prefix form): an
 * underscore before each interior uppercase, then uppercase all.
 */
export const toScreamingPrefix = (clientPrefix: string): string => {
  return clientPrefix.replace(/(?<!^)([A-Z])/g, '_$1').toUpperCase()
}
