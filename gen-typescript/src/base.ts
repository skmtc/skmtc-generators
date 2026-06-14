import { capitalize, decapitalize, camelCase } from '@skmtc/core'
import { toTsModelProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'

export const TypescriptBase = toTsModelProjectionBase<EnrichmentSchema>({
  id: '@skmtc/gen-typescript',

  toIdentifierName({ refName }): string {
    return capitalize(camelCase(refName))
  },

  toIdentifierType: () => ({ kind: 'type' }),

  toExportPath({ refName, enrichments, variant }): string {
    const name = this.toIdentifierName({ refName, enrichments, variant })

    return join('@', 'types', `${decapitalize(name)}.generated.ts`)
  },

  toEnrichmentSchema
})
