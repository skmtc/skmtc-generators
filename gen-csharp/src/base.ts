import { capitalize, camelCase } from '@skmtc/core'
import {
  toModelProjectionBase,
  createAbstractRecord,
  createRecord,
  createEnum
} from '@skmtc/lang-csharp'
import { join } from '@std/path'
import { getBaseNamespace } from './baseNamespace.ts'
import { modelEnrichmentSchema, type ModelEnrichment } from './modelNames.ts'
import denoJson from '../deno.json' with { type: 'json' }

/** PascalCase model name from a schema refName — shared by all the bases. */
export const toCsModelName = (refName: string): string => {
  return capitalize(camelCase(refName))
}

/**
 * The shared export path: the segments after `@/` ARE the namespace
 * parts (`CsFile` derives the `namespace` directive from them), so a
 * model lands at `@/<baseNamespace dirs>/<Name>.generated.cs` under the
 * project source root the consumer's `basePath` points at — one type
 * per file, the .NET convention analyzers expect.
 */
export const toCsModelExportPath = (name: string): string => {
  return join('@', ...getBaseNamespace().split('.'), `${name}.generated.cs`)
}

/**
 * gen-csharp ships one projection base PER KIND — C#'s declaration kind
 * varies by schema shape (object → record, string enum → enum), and
 * `toIdentifier` cannot see the schema, so the kind is constant per
 * class and the shape dispatch lives at the layers that have context
 * (`toCsProjection`, called by the transform and by `CsRef`). Both
 * bases share the name and export-path derivation, so for one refName
 * every class agrees on the `(name, exportPath)` cache key.
 *
 * There is NO catch-all base: C# has no exported type alias (D6), so
 * non-declarable refNames produce no artifact at all — ref sites inline
 * the type expression instead.
 *
 * The bases declare the CD1 rename enrichment (`main.name` — the
 * spec-28 port): the alias names the identifier AND the file; insert
 * sites get it through this channel, name-only sites through
 * `toCsModelDisplayName` — one rule, two routes.
 */
export const CsRecordBase = toModelProjectionBase<ModelEnrichment>({
  id: denoJson.name,

  toEnrichmentSchema: () => modelEnrichmentSchema,

  toIdentifier({ refName, enrichments }) {
    return createRecord(enrichments?.name ?? toCsModelName(refName))
  },

  toExportPath({ refName, enrichments }) {
    return toCsModelExportPath(enrichments?.name ?? toCsModelName(refName))
  }
})

export const CsAbstractRecordBase = toModelProjectionBase<ModelEnrichment>({
  id: denoJson.name,

  toEnrichmentSchema: () => modelEnrichmentSchema,

  toIdentifier({ refName, enrichments }) {
    return createAbstractRecord(enrichments?.name ?? toCsModelName(refName))
  },

  toExportPath({ refName, enrichments }) {
    return toCsModelExportPath(enrichments?.name ?? toCsModelName(refName))
  }
})

export const CsEnumBase = toModelProjectionBase<ModelEnrichment>({
  id: denoJson.name,

  toEnrichmentSchema: () => modelEnrichmentSchema,

  toIdentifier({ refName, enrichments }) {
    return createEnum(enrichments?.name ?? toCsModelName(refName))
  },

  toExportPath({ refName, enrichments }) {
    return toCsModelExportPath(enrichments?.name ?? toCsModelName(refName))
  }
})
