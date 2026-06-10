import { toModelEntry } from '@skmtc/core'
import { setBasePackage } from './basePackage.ts'
import { setCustomScalars } from './scalars.ts'
import { toKtProjection } from './toKtProjection.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Options for {@link toKotlinEntry}.
 */
export type KotlinEntryOptions = {
  /**
   * REQUIRED: the Kotlin package generated models land in
   * (e.g. `'com.example.api'`). Encoded into every export path —
   * `@/<basePackage dirs>/<Name>.generated.kt` — so with
   * `client.json#settings.basePath` pointing at the Gradle source root
   * (e.g. `./app/src/main/kotlin`), files land on the package-=-folder
   * convention and `KtFile` derives each `package` directive from the
   * path. There is deliberately no default.
   */
  basePackage: string
  /**
   * Map of `format` keys → emitted Kotlin type names, merged on top of
   * the defaults (every known string format → `String`, `binary` →
   * `ByteArray`). Pass `replaceScalars: true` to ignore defaults.
   */
  scalars?: Record<string, string>
  /** If true, `scalars` replaces the built-in defaults instead of merging. */
  replaceScalars?: boolean
}

/**
 * Factory for the gen-kotlin model entry. Emits Kotlin DTOs from
 * `components.schemas`: `data class` for objects, `enum class` for
 * string enums, `typealias` for everything else — serialization flavor
 * is `kotlinx.serialization` (`@Serializable` + `@SerialName`).
 *
 * Unlike `gen-typescript` there is NO default-config entry export:
 * `basePackage` has no safe default.
 */
export const toKotlinEntry = (options: KotlinEntryOptions) => {
  setBasePackage(options.basePackage)

  if (options.scalars !== undefined) {
    setCustomScalars(options.scalars, { replace: options.replaceScalars })
  }

  return toModelEntry({
    id: denoJson.name,
    transform({ context, refName }) {
      const schema = context.resolveSchemaRefOnce(refName, denoJson.name)

      context.insertModel(toKtProjection(schema), refName)
    }
  })
}
