import { toStackEnrichment } from '@skmtc/core'
import type { GenerateContextType } from '@skmtc/core'
import { sdkConfigSchema, type SdkConfig } from '@/SdkConfig.ts'

/**
 * The SDK-global config, read from the shared `_stack` enrichment
 * (`client.json#settings.enrichments._stack`) — the id-agnostic scope the
 * embedded jackson-s model engine also reads, so one blob serves both. Read
 * on demand from any context holder; no baked-in JSON, no module-global.
 */
export const toSdkConfig = (context: GenerateContextType): SdkConfig =>
  toStackEnrichment(context, sdkConfigSchema)
