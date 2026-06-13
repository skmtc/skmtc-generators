import { toGqlOperationProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

const stripGetPrefix = (name: string): string => (name.startsWith('Get') ? name.slice(3) : name)

const decapitalize = (name: string): string =>
  name.length === 0 ? name : name[0].toLowerCase() + name.slice(1)

export const ReapitSearchableDropdownBase = toGqlOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifierName({ operation }): string {
    // GetOffices → OfficesMultiLookupField, GetNegotiators → NegotiatorsMultiLookupField
    const stripped = stripGetPrefix(operation.fieldName)
    return `${stripped}MultiLookupField`
  },

  toIdentifierType: () => ({ kind: 'variable' }),

  toExportPath({ operation, enrichments }): string {
    const stripped = stripGetPrefix(operation.fieldName)
    return join('@', 'forms', 'fields', `${decapitalize(stripped)}Lookup.generated.tsx`)
  }
})
