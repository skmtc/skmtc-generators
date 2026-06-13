import { capitalize, camelCase } from '@skmtc/core'
import { toModelProjectionBase } from '@skmtc/lang-kotlin'
import { join } from '@std/path'
import { getBasePackage } from './basePackage.ts'
import { peekSchema } from './peekSchema.ts'
import { toKtModelShape } from './toKtModelShape.ts'
import { modelEnrichmentSchema, type ModelEnrichment } from './modelNames.ts'
import denoJson from '../deno.json' with { type: 'json' }

/** PascalCase model name from a schema refName. */
export const toKtModelName = (refName: string): string => {
  return capitalize(camelCase(refName))
}

/**
 * The shared export path: the segments after `@/` ARE the package
 * directories (`KtFile` derives the `package` directive from them), so a
 * model lands at `@/<basePackage dirs>/<Name>.generated.kt` under the
 * Gradle source root the consumer's `basePath` points at.
 */
export const toKtModelExportPath = (name: string): string => {
  return join('@', ...getBasePackage().split('.'), `${name}.generated.kt`)
}

/**
 * gen-kotlin ships ONE model projection base. Kotlin's declaration kind
 * varies by schema shape (object → data class, string enum → enum class,
 * qualifying union → sealed interface, the rest → typealias), and the
 * context-aware `toIdentifierType` derives it from the schema — the work
 * the old per-class `toKtProjection` dispatch did, now folded into the
 * projection static. `toIdentifierName` is the pure cache-key name; the
 * kind comes from {@link toKtModelShape} (the single shape source the
 * `KtModelProjection` constructor reads too, so kind and value agree).
 *
 * Declares the CD1 rename enrichment (`main.name`): the alias names the
 * identifier AND the file; insert sites get it through this channel,
 * name-only sites through `toKtModelDisplayName`.
 */
export const KtModelBase = toModelProjectionBase<ModelEnrichment>({
  id: denoJson.name,

  toEnrichmentSchema: () => modelEnrichmentSchema,

  toIdentifierName({ refName, enrichments }) {
    return enrichments?.name ?? toKtModelName(refName)
  },

  toIdentifierType(refName, context) {
    return { kind: toKtModelShape(context, peekSchema(context, refName)) }
  },

  toExportPath({ refName, enrichments }) {
    return toKtModelExportPath(enrichments?.name ?? toKtModelName(refName))
  }
})
