import { camelCase, capitalize, Identifier } from '@skmtc/core'
import { toGqlOperationProjectionBase, createVariable } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ReapitFormBase = toGqlOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifier({ operation }): Identifier {
    const name = `${capitalize(camelCase(operation.fieldName))}Form`

    return createVariable(name)
  },

  toExportPath({ operation, enrichments, variant }): string {
    const { name } = this.toIdentifier({ operation, enrichments, variant })

    return join('@', 'forms', `${name}.generated.tsx`)
  }
})
