import {
  Identifier,
  toGeneratorOnlyKey,
  type GqlOperationProjectionConstructorArgs
} from '@skmtc/core'
import { ReapitSearchableDropdownBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

const id = denoJson.name

const stripGetPrefix = (name: string): string =>
  name.startsWith('Get') ? name.slice(3) : name

// Pluralized GraphQL field name → singular row-type stem. Matches the
// English-pluralization fields the Reapit gateway uses (Offices,
// Negotiators, Companies, Properties). Conservative: strip a trailing
// `s` only when the previous letter is a consonant; leave plain words
// unchanged when uncertain. Consumer can override the row name via a
// future enrichment if this guess is wrong for their schema.
const singularize = (plural: string): string => {
  if (plural.endsWith('ies') && plural.length > 3) return plural.slice(0, -3) + 'y'
  if (plural.endsWith('ses') && plural.length > 3) return plural.slice(0, -2)
  if (plural.endsWith('s') && plural.length > 1) return plural.slice(0, -1)
  return plural
}

/**
 * GraphQL Query → searchable multi-select component generator.
 *
 * Emits a thin wrapper around the consumer's `<SearchableMultiLookup>`
 * widget, defining the GraphQL lookup query inline and binding
 * `getValue` / `getLabel` / `search` to the operation's row shape.
 *
 * Composes with `gen-reapit-form` via the operation-reference protocol
 * (per-field `references` / `referenceKind: 'searchable'` enrichment).
 */
export class ReapitSearchableDropdown extends ReapitSearchableDropdownBase {
  rowTypeName: string
  queryConstName: string

  constructor({ context, operation, settings }: GqlOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const stripped = stripGetPrefix(operation.fieldName)
    this.rowTypeName = `${singularize(stripped)}LookupRow`
    this.queryConstName = `${stripped.toUpperCase()}_LOOKUP_QUERY`

    this.register({
      imports: {
        '@hookform/lenses': ['Lens'],
        '@/forms/fields': ['SearchableMultiLookup'],
        '@/lib/graphql-client': ['gqlRequest']
      }
    })

    this.defineAndRegister({
      identifier: Identifier.createType(this.rowTypeName),
      value: {
        generatorKey: toGeneratorOnlyKey({ generatorId: id }),
        toString: () => `{ id: string | null; name: string | null }`
      }
    })

    const queryBody = `query ${stripped}Lookup($name: String) {
  ${operation.fieldName}(name: $name, pageSize: 10) {
    _embedded { id name }
  }
}`
    this.defineAndRegister({
      identifier: Identifier.createVariable(this.queryConstName),
      value: {
        generatorKey: toGeneratorOnlyKey({ generatorId: id }),
        toString: () => '`\n' + queryBody + '\n`'
      }
    })
  }

  override toString(): string {
    return `({ lens, label }: { lens: Lens<string[]>; label?: string }) => {
  const search = async (q: string): Promise<${this.rowTypeName}[]> => {
    const data = await gqlRequest<{ ${this.operation.fieldName}: { _embedded: ${this.rowTypeName}[] | null } }>(
      ${this.queryConstName},
      { name: q }
    )
    return data.${this.operation.fieldName}._embedded ?? []
  }
  return (
    <SearchableMultiLookup<${this.rowTypeName}>
      lens={lens}
      label={label}
      search={search}
      getValue={r => r.id ?? ''}
      getLabel={r => r.name ?? r.id ?? ''}
    />
  )
}`
  }
}
