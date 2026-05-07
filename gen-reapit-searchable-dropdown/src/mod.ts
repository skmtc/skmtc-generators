import { toGqlOperationEntry, type OasObject, type OasRef, type OasSchema } from '@skmtc/core'
import { ReapitSearchableDropdown } from './ReapitSearchableDropdown.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * gen-reapit-searchable-dropdown: emits one `<XMultiLookupField>` per
 * GraphQL **Query** root field whose return type is a paged result
 * carrying `_embedded: [T]` with scalar `id` and `name` properties.
 *
 * Output is a thin file under `@/forms/fields/<name>Lookup.generated.tsx`
 * wrapping the consumer-provided `<SearchableMultiLookup>` widget — the
 * generator owns the per-query slice (search wiring, GraphQL query
 * string, row-type alias) and delegates UI/state complexity to the
 * widget.
 *
 * Designed to be dispatched by form generators via the operation-reference
 * protocol (`context.insertOperation`), but `isSupported` is *broad* so
 * the generator also produces files standalone for any qualifying query
 * the outer loop visits.
 */
export const reapitSearchableDropdownEntry = toGqlOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  isSupported({ operation }): boolean {
    if (operation.rootKind !== 'query') return false
    const inner = unwrapPagedItem(operation.returnType)
    if (!inner) return false
    return hasScalarStringField(inner, 'id') && hasScalarStringField(inner, 'name')
  },

  transform({ context, operation, acc }) {
    context.insertOperation({ insertable: ReapitSearchableDropdown, operation })
    return acc
  },

  toPreviewModule: ({ operation }) => ({
    name: ReapitSearchableDropdown.toIdentifier(operation).name,
    exportPath: ReapitSearchableDropdown.toExportPath(operation),
    group: 'forms'
  }),

  toEnrichmentSchema
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
