import { capitalize, camelCase } from '@skmtc/core'
import {
  toModelProjectionBase,
  createDataClass,
  createEnumClass,
  createSealedInterface,
  createTypeAlias
} from '@skmtc/lang-kotlin'
import { join } from '@std/path'
import { getBasePackage } from './basePackage.ts'
import { modelEnrichmentSchema, type ModelEnrichment } from './modelNames.ts'
import denoJson from '../deno.json' with { type: 'json' }

/** PascalCase model name from a schema refName — shared by all the bases. */
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
 * gen-kotlin ships one projection base PER KIND — Kotlin's declaration
 * kind varies by schema shape (object → data class, string enum → enum
 * class, the rest → typealias), and `toIdentifier` cannot see the schema,
 * so the kind is constant per class and the shape dispatch lives at the
 * layers that have context (`toKtProjection`, called by the transform and
 * by `KtRef`). All three bases share the name and export-path derivation,
 * so for one refName every class agrees on the `(name, exportPath)`
 * cache key.
 */
export const KtDataClassBase = toModelProjectionBase<ModelEnrichment>({
  id: denoJson.name,

  toEnrichmentSchema: () => modelEnrichmentSchema,

  toIdentifier({ refName, enrichments }) {
    return createDataClass(enrichments?.name ?? toKtModelName(refName))
  },

  toExportPath({ refName, enrichments }) {
    return toKtModelExportPath(enrichments?.name ?? toKtModelName(refName))
  }
})

export const KtEnumClassBase = toModelProjectionBase<ModelEnrichment>({
  id: denoJson.name,

  toEnrichmentSchema: () => modelEnrichmentSchema,

  toIdentifier({ refName, enrichments }) {
    return createEnumClass(enrichments?.name ?? toKtModelName(refName))
  },

  toExportPath({ refName, enrichments }) {
    return toKtModelExportPath(enrichments?.name ?? toKtModelName(refName))
  }
})

export const KtTypeAliasBase = toModelProjectionBase<ModelEnrichment>({
  id: denoJson.name,

  toEnrichmentSchema: () => modelEnrichmentSchema,

  toIdentifier({ refName, enrichments }) {
    return createTypeAlias(enrichments?.name ?? toKtModelName(refName))
  },

  toExportPath({ refName, enrichments }) {
    return toKtModelExportPath(enrichments?.name ?? toKtModelName(refName))
  }
})

export const KtSealedInterfaceBase = toModelProjectionBase<ModelEnrichment>({
  id: denoJson.name,

  toEnrichmentSchema: () => modelEnrichmentSchema,

  toIdentifier({ refName, enrichments }) {
    return createSealedInterface(enrichments?.name ?? toKtModelName(refName))
  },

  toExportPath({ refName, enrichments }) {
    return toKtModelExportPath(enrichments?.name ?? toKtModelName(refName))
  }
})
