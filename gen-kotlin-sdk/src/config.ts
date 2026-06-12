import sdkConfigJson from '@/sdk-config.json' with { type: 'json' }
import { toSdkConfig, type SdkConfig } from '@/SdkConfig.ts'

/**
 * The SDK-global config, imported directly (no factory closure) —
 * the Q6 interim for the coming core global-enrichment tier. The
 * corpus harness swaps `src/sdk-config.json` per target before
 * importing the entry.
 */
export const sdkConfig: SdkConfig = toSdkConfig(sdkConfigJson)
