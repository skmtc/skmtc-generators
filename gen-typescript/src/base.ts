import { capitalize, decapitalize, camelCase } from '@skmtc/core'
import { toTsModelProjectionBase } from '@skmtc/lang-typescript'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'

export const TypescriptBase = toTsModelProjectionBase<EnrichmentSchema>({
  id: '@skmtc/gen-typescript',

  toIdentifierName({ refName }): string {
    const name = capitalize(camelCase(refName))

    // A schema named `200` would give `export type 200`. The prefix differs
    // from gen-zod's so the two names stay apart in a shared file.
    return /^[0-9]/.test(name) ? `Type${name}` : name
  },

  toIdentifierType: () => ({ type: 'type' }),

  // `this` is this base's config, so the file follows the base's own name. A projection
  // that overrides toIdentifierName keeps this file unless it overrides toExportPath too.
  toExportPath({ refName, enrichments, variant }): string {
    const exportPath = enrichments?.generator?.exportPath

    if (exportPath) {
      return exportPath
    }

    const name = this.toIdentifierName({ refName, enrichments, variant })

    return `@/types/${decapitalize(name)}.generated.ts`
  },

  toEnrichmentSchema
})
