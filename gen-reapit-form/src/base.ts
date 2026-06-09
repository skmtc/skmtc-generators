import { camelCase, capitalize, Identifier, toGqlOperationProjectionBase } from '@skmtc/core'
import { typescript } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ReapitFormBase = toGqlOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,
  lang: typescript,

  toEnrichmentSchema,

  toIdentifier({ operation }): Identifier {
    const name = `${capitalize(camelCase(operation.fieldName))}Form`

    return Identifier.createVariable(name)
  },

  toExportPath({ operation, enrichments, variant }): string {
    const { name } = this.toIdentifier({ operation, enrichments, variant })

    return join('@', 'forms', `${name}.generated.tsx`)
  }
})
