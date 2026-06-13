import settings from '@/settings.json' with { type: 'json' }

/** The model layer's config slice — the SDK's SdkConfig is a structural
 * superset, so setModelConfig(sdkConfig) is assignable. */
export type ModelConfig = {
  basePackage: string
  clientPrefix: string
  artifactName: string
  hoistField?: string
  kotlinNames?: Record<string, string>
  fieldStates?: Record<string, 'required-nullable'>
  fieldEnums?: Record<string, string[]>
  sharedModels: {
    envelope?: { className: string; fields: string[]; source: { path: string; method: string } }
  }
}

/**
 * `src/settings.json` is the standalone default the shared engine reads when
 * nothing overrides it — so the gen-kotlin-jackson-s entry needs no per-ref
 * `setModelConfig` call. A host with its own document-global config (the SDK)
 * calls {@link setModelConfig} once at the top of its transform to OVERRIDE
 * per target. INTERIM: to be replaced by the core document-global config tier
 * read off `context.settings`.
 */
const defaultConfig: ModelConfig = settings

let override: ModelConfig | undefined

export const setModelConfig = (config: ModelConfig): void => {
  override = config
}

export const getModelConfig = (): ModelConfig => {
  return override ?? defaultConfig
}

export const resetModelConfig = (): void => {
  override = undefined
}
