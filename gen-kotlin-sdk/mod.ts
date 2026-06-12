/**
 * @module @skmtc/gen-kotlin-sdk
 *
 * Stainless-shape Kotlin SDK generator (arc note `32`). MIT-licensed;
 * the static-runtime template data is derived from Apache-2.0 material
 * — see `templates/NOTICE.md`.
 */
import { toKotlinSdkEntry } from './src/mod.ts'
import { toFieldStates } from './src/SdkConfig.ts'
import sdkConfig from './src/sdk-config.json' with { type: 'json' }

export { toKotlinSdkEntry, type SdkConfig, type SdkAuthConfig } from './src/mod.ts'

export default toKotlinSdkEntry({
  ...sdkConfig,
  fieldStates: toFieldStates(sdkConfig.fieldStates)
})
