import { capitalize, decapitalize, camelCase } from '@skmtc/core'
import { sanitizeIdentifier, toTsModelProjectionBase } from '@skmtc/lang-typescript'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'

export const TypescriptBase = toTsModelProjectionBase<EnrichmentSchema>({
  id: '@skmtc/gen-typescript',
  // The model's `name` enrichment, or a name from `refName`. `ref.refPath` is
  // passed too and is not read by default.
  toIdentifierName({ ref, enrichments }): string {
    return enrichments.subject?.name ?? sanitizeIdentifier(capitalize(camelCase(ref.refName)))
  },

  toIdentifierType: () => ({ type: 'type' }),

  // `this` is this base's config, so the file follows the base's own name. A projection
  // that overrides toIdentifierName keeps this file unless it overrides toExportPath too.
  toExportPath({ ref, enrichments, variant }): string {
    const name = this.toIdentifierName({ ref, enrichments, variant })

    return `@/types/${decapitalize(name)}.generated.ts`
  },

  toEnrichmentSchema
})
