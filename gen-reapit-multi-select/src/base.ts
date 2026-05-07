import {
  Identifier,
  toGqlOperationProjectionBase,
  type OasObject,
  type OasRef,
  type OasSchema
} from '@skmtc/core'
import { join } from '@std/path'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

const stripGetPrefix = (name: string): string => (name.startsWith('Get') ? name.slice(3) : name)

const decapitalize = (name: string): string =>
  name.length === 0 ? name : name[0].toLowerCase() + name.slice(1)

// Symbol/path conventions diverge from gen-reapit-searchable-dropdown so
// the two generators can coexist in the same project: the multi-select
// files end in `MultiSelect.generated.tsx` and the exported component is
// `<XMultiSelectField>`. Keeping the suffixes distinct ensures content-
// addressed identity collisions are impossible.
export const ReapitMultiSelectBase = toGqlOperationProjectionBase<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

  toIdentifier(operation): Identifier {
    const stripped = stripGetPrefix(operation.fieldName)
    return Identifier.createVariable(`${stripped}MultiSelectField`)
  },

  toExportPath(operation): string {
    const stripped = stripGetPrefix(operation.fieldName)
    return join('@', 'forms', 'fields', `${decapitalize(stripped)}MultiSelect.generated.tsx`)
  }
})
