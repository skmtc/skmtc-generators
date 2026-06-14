import { capitalize, camelCase } from '@skmtc/core'
import { toKtModelProjectionBase } from '@skmtc/lang-kotlin'
import settings from '@/settings.json' with { type: 'json' }
import denoJson from '../deno.json' with { type: 'json' }
import { toEnrichmentSchema, type EnrichmentSchema } from '@/enrichments.ts'

/** PascalCase model name from a schema refName. */
export const toJacksonSModelName = (refName: string): string => {
  return capitalize(camelCase(refName))
}

/**
 * The standalone Jackson/Stainless model projection base. Every model is
 * a Kotlin `class` (the `@JsonCreator` + `JsonField` + builder shape the
 * engine produces), so `toIdentifierType` is the constant `class` kind —
 * still routed through the projection layer (`toIdentifierName` for the
 * cache-key name, `toIdentifierType` for the kind), per the arc's goal.
 *
 * The export path puts each model at `@/<basePackage dirs>/models/<Name>.kt`
 * (the segments after `@/` ARE the package directories — `KtFile` derives
 * the `package` directive from them), reading `basePackage` straight from
 * `settings.json`.
 */
export const JacksonSModelBase = toKtModelProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toIdentifierName({ refName }) {
    return toJacksonSModelName(refName)
  },

  toIdentifierType: () => ({ kind: 'class' }),

  toExportPath({ refName }) {
    const name = toJacksonSModelName(refName)
    const packageDirs = settings.basePackage.split('.').join('/')

    return `@/${packageDirs}/models/${name}.kt`
  },

  toEnrichmentSchema
})
