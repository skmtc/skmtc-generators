import { camelCase, capitalize, Identifier, toGqlOperationProjectionBase } from '@skmtc/core'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ReapitFormBase = toGqlOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifier(operation): Identifier {
    const name = `${capitalize(camelCase(operation.fieldName))}Form`

    return Identifier.createVariable(name)
  },

  toExportPath(operation): string {
    const { name } = this.toIdentifier(operation)

    return join('@', 'forms', `${name}.generated.tsx`)
  }
})
