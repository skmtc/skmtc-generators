import { capitalize, camelCase } from '@skmtc/core'
import {
  toModelProjectionBase,
  createDataClass,
  createEnumClass,
  createTypeAlias
} from '@skmtc/lang-kotlin'
import { join } from '@std/path'
import { getBasePackage } from './basePackage.ts'
import denoJson from '../deno.json' with { type: 'json' }

/** PascalCase model name from a schema refName — shared by all three bases. */
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
export const KtDataClassBase = toModelProjectionBase({
  id: denoJson.name,

  toIdentifier({ refName }) {
    return createDataClass(toKtModelName(refName))
  },

  toExportPath({ refName }) {
    return toKtModelExportPath(toKtModelName(refName))
  }
})

export const KtEnumClassBase = toModelProjectionBase({
  id: denoJson.name,

  toIdentifier({ refName }) {
    return createEnumClass(toKtModelName(refName))
  },

  toExportPath({ refName }) {
    return toKtModelExportPath(toKtModelName(refName))
  }
})

export const KtTypeAliasBase = toModelProjectionBase({
  id: denoJson.name,

  toIdentifier({ refName }) {
    return createTypeAlias(toKtModelName(refName))
  },

  toExportPath({ refName }) {
    return toKtModelExportPath(toKtModelName(refName))
  }
})
