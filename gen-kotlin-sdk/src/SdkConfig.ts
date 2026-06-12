/**
 * SDK-global identity — the gen-kotlin-sdk counterpart of the
 * document-global half of a Stainless config (note 32 §A4 / Q6).
 *
 * INTERIM mechanism: a hardcoded JSON file (`src/sdk-config.json`)
 * feeds the default entry export; the corpus harness constructs the
 * entry directly via `toKotlinSdkEntry(config)`. Swaps to the core
 * document-global enrichment tier when that lands. Every field here is
 * evidence for that tier's design — all nine template tokens trace to
 * these values.
 */
export type SdkAuthConfig = {
  /** Environment variable the client reads the API key from (`ONEBUSAWAY_API_KEY`). */
  envVar: string
  /** The client-options property name for the key (`onebusawayApiKey`). */
  propertyName: string
}

export type SdkConfig = {
  /** Base Kotlin package (`org.onebusaway`) — also the package directories. */
  basePackage: string
  /** Client class prefix (`OnebusawaySdk` → `OnebusawaySdkClient`); SCREAM and lower forms derive from it. */
  clientPrefix: string
  /** Gradle artifact stem (`onebusaway-sdk-kotlin`) — module dirs are `<artifactName>-core` etc. */
  artifactName: string
  /** GitHub slug (`OneBusAway/kotlin-sdk`) — appears in doc links. */
  repoSlug: string
  /** Human display name for the client KDoc (`Onebusaway SDK`). */
  displayName: string
  /** Production base URL baked into ClientOptions. */
  baseUrl: string
  /** Sandbox base URL (targets with environments — Lithic). */
  sandboxUrl?: string
  /** Webhook secret env var (targets with webhooks — Lithic). */
  webhookSecretEnvVar?: string
  /** API-key auth wiring (the only scheme on the simple target). */
  auth: SdkAuthConfig
  /** The §C5 config-asserted shared models. */
  sharedModels: SdkSharedModelsConfig
  /**
   * Per-wire-name field-state overrides — the config-mirrored
   * equivalent of a Stainless required/nullable transform (the
   * corpus `limitExceeded` finding: fence-listed + required wording,
   * nullable accessor, no `checkRequired`).
   */
  fieldStates?: Record<string, 'required-nullable'>
  /**
   * Config-mirrored enum assertions for string fields the spec leaves
   * open (the corpus `Situation.reason` TPEG codes — the members live
   * in Stainless's config, not the spec). Keyed by wire name.
   */
  fieldEnums?: Record<string, string[]>
}

/**
 * Shared-model asserts (note 32 §C5): `extracted` models replace every
 * structurally-identical inline occurrence; the `envelope` is the
 * response-wrapper class each covering response converts to.
 */
export type SdkSharedModelsConfig = {
  extracted: {
    className: string
    /** One canonical occurrence: an operation + a `/`-pointer into its response schema. */
    source: { path: string; method: string; pointer: string }
  }[]
  /** Absent on targets without a response envelope (Lithic). */
  envelope?: {
    className: string
    /** Wire names of the envelope fields, in schema order. */
    fields: string[]
    /** Operation whose response supplies the envelope field types. */
    source: { path: string; method: string }
  }
}

/**
 * `OnebusawaySdk` → `ONEBUSAWAY_SDK` (the env-var prefix form): an
 * underscore before each interior uppercase, then uppercase all.
 */
export const toScreamingPrefix = (clientPrefix: string): string => {
  return clientPrefix.replace(/(?<!^)([A-Z])/g, '_$1').toUpperCase()
}

/**
 * Narrows a JSON-imported `fieldStates` record (whose values widen to
 * `string`) to the state union — loud on an unknown state, no casts.
 */
export const toFieldStates = (
  raw: Record<string, string> | undefined
): Record<string, 'required-nullable'> | undefined => {
  if (!raw) {
    return undefined
  }

  const states: Record<string, 'required-nullable'> = {}

  for (const [wireName, state] of Object.entries(raw)) {
    if (state !== 'required-nullable') {
      throw new Error(`@skmtc/gen-kotlin-sdk: unknown field state '${state}' for '${wireName}'`)
    }

    states[wireName] = state
  }

  return states
}
