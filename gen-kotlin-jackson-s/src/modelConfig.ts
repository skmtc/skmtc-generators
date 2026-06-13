/** The model layer's config slice — the SDK's SdkConfig is a structural
 * superset, so setModelConfig(sdkConfig) is assignable. Module-scope state,
 * per-run-safe (fresh Worker per generate), the gen-kotlin basePackage
 * precedent. */
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

let current: ModelConfig | undefined

export const setModelConfig = (config: ModelConfig): void => {
  current = config
}

export const getModelConfig = (): ModelConfig => {
  if (!current) {
    throw new Error('@skmtc/gen-kotlin-jackson-s: model config not set — call setModelConfig() before generating')
  }
  return current
}

export const resetModelConfig = (): void => {
  current = undefined
}
