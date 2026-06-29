import { toKtModelProjectionBase } from '@skmtc/lang-kotlin'
import { join } from '@std/path'
import { toKtModelName } from './modelNames.ts'
import { peekSchema } from './peekSchema.ts'
import { toKtModelShape } from './toKtModelShape.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * The shared export path: the segments after `@/` ARE the package
 * directories (`KtFile` derives the `package` directive from them), so a
 * model lands at `@/<basePackage dirs>/<Name>.generated.kt` under the
 * Gradle source root the consumer's `basePath` points at.
 */
export const toKtModelExportPath = (name: string, basePackage: string): string => {
  return join('@', ...basePackage.split('.'), `${name}.generated.kt`)
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
export const KtModelBase = toKtModelProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifierName({ refName, enrichments }) {
    return enrichments?.subject?.name ?? toKtModelName(refName)
  },

  toIdentifierType(refName, context) {
    return { type: toKtModelShape(context, peekSchema(context, refName)) }
  },

  toExportPath({ refName, enrichments }) {
    return toKtModelExportPath(
      enrichments?.subject?.name ?? toKtModelName(refName),
      enrichments.generator.basePackage
    )
  }
})
