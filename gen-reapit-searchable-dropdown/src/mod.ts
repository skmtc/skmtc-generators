import {
  toGqlOperationEntry,
  type GqlOperation,
  type OasObject,
  type OasRef,
  type OasSchema
} from '@skmtc/core'
import { typescript } from '@skmtc/lang-typescript'
import { ReapitSearchableDropdown } from './ReapitSearchableDropdown.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * gen-reapit-searchable-dropdown: emits one search-driven multi-select
 * component per qualifying GraphQL **Query** root field.
 *
 * Three predicates gate inclusion:
 *  - root kind is `query`
 *  - return type is the Reapit paged shape (`{ _embedded: [T] }` with
 *    `T.id` and `T.name` both scalar strings)
 *  - the operation accepts a `name: String` argument used for filtering
 *
 * The third gate is what differentiates this from `gen-reapit-multi-select`:
 * a query without a name filter can't be searched against, so it falls
 * outside this generator's scope.
 *
 * Designed to be inserted by `gen-reapit-form` via the operation-reference
 * protocol with `referenceKind: 'searchable'`. Output goes to
 * `@/forms/fields/<name>Lookup.generated.tsx`.
 */
export const reapitSearchableDropdownEntry = toGqlOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  lang: typescript,

  isSupported({ operation }): boolean {
    if (operation.rootKind !== 'query') return false
    const inner = unwrapPagedItem(operation.returnType)
    if (!inner) return false
    if (!hasScalarStringField(inner, 'id')) return false
    if (!hasScalarStringField(inner, 'name')) return false
    return hasNameStringArgument(operation)
  },

  transform({ context, operation, acc }) {
    context.insertOperation({ projection: ReapitSearchableDropdown, operation })
    return acc
  },

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
  return item
}

const hasScalarStringField = (obj: OasObject, name: string): boolean => {
  const prop = obj.properties?.[name]
  if (!prop) return false
  const resolved = prop.isRef() ? prop.resolve() : prop
  return resolved.type === 'string'
}

const hasNameStringArgument = (operation: GqlOperation): boolean =>
  operation.arguments.some(
    arg => arg.name === 'name' && arg.gqlType.startsWith('String')
  )
