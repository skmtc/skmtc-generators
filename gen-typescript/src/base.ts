import { capitalize, decapitalize, camelCase } from '@skmtc/core'
import { toTsModelProjectionBase } from '@skmtc/lang-typescript'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'

export const TypescriptBase = toTsModelProjectionBase<EnrichmentSchema>({
  id: '@skmtc/gen-typescript',

  toIdentifierName({ refName }): string {
    return capitalize(camelCase(refName))
  },

  toIdentifierType: () => ({ type: 'type' }),

  // `this` is this base's config, so the file follows the base's own name. A projection
  // that overrides toIdentifierName keeps this file unless it overrides toExportPath too.
  toExportPath({ refName, enrichments, variant }): string {
    const name = this.toIdentifierName({ refName, enrichments, variant })

    return `@/types/${decapitalize(name)}.generated.ts`
  },

  toEnrichmentSchema
})
