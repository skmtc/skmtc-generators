import { capitalize, decapitalize, camelCase } from '@skmtc/core'
import { toTsModelProjectionBase } from '@skmtc/lang-typescript'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'

export const TypescriptBase = toTsModelProjectionBase<EnrichmentSchema>({
  id: '@skmtc/gen-typescript',

  toIdentifierName({ refName }): string {
    return capitalize(camelCase(refName))
  },

  toIdentifierType: () => ({ type: 'type' }),

  // Calls TypescriptBase by name: `this` is the bound config, never a projection override.
  // Keep the `: string` return type, or the self-reference is circular (TS7022).
  toExportPath({ refName, enrichments, variant }): string {
    const name = TypescriptBase.toIdentifierName({ refName, enrichments, variant })

    return `@/types/${decapitalize(name)}.generated.ts`
  },

  toEnrichmentSchema
})
