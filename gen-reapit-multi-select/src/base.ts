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

const unwrapPagedItem = (schema: OasSchema | OasRef<'schema'>): OasObject | undefined => {
  const resolved = schema.isRef() ? schema.resolve() : schema
  if (resolved.type !== 'object' || !resolved.properties) return undefined
  const embedded = resolved.properties['_embedded']
  if (!embedded) return undefined
  const arr = embedded.isRef() ? embedded.resolve() : embedded
  if (arr.type !== 'array' || !arr.items) return undefined
  const item = arr.items.isRef() ? arr.items.resolve() : arr.items
  if (item.type !== 'object') return undefined
  return item as OasObject
}

const hasScalarStringField = (obj: OasObject, name: string): boolean => {
  const prop = obj.properties?.[name]
  if (!prop) return false
  const resolved = prop.isRef() ? prop.resolve() : prop
  return resolved.type === 'string'
}
