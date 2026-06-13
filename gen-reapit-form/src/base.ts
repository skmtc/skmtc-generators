import { camelCase, capitalize } from '@skmtc/core'
import { toGqlOperationProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ReapitFormBase = toGqlOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifierName({ operation }): string {
    const name = `${capitalize(camelCase(operation.fieldName))}Form`

    return name
  },

  toIdentifierType: () => ({ kind: 'variable' }),

  toExportPath({ operation, enrichments, variant }): string {
    const name = this.toIdentifierName({ operation, enrichments, variant })

    return join('@', 'forms', `${name}.generated.tsx`)
  }
})
