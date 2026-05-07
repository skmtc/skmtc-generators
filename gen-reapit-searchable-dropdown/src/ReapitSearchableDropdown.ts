import { type GqlOperationProjectionConstructorArgs } from '@skmtc/core'
import { ReapitGraphqlClient } from '@skmtc/gen-reapit-graphql-client'
import { ReapitSearchableDropdownBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'

/**
 * GraphQL Query → Reapit Elements `<ControlledSearchableDropdown>`
 * component generator.
 *
 * Emits a self-contained search-driven multi-select per qualifying
 * query. The data layer is delegated to `gen-reapit-graphql-client` via
 * the operation-reference protocol — the emitted file pulls in the
 * `useGetX` hook (a debounced React Query call backed by graphql-request)
 * and binds it to the dropdown's `value` / `resultsList` props. Selected
 * items render as removable Reapit `<Chip hasClose>` elements above
 * the search input.
 *
 * Composes with `gen-reapit-form` via the operation-reference protocol
 * with `referenceKind: 'searchable'`.
 *
 * Right shape for *unbounded* entity sets (offices, negotiators, etc.).
 * For *bounded* sets (small enums, fixed-size lookups), prefer
 * `gen-reapit-multi-select` which renders all options inline.
 */
export class ReapitSearchableDropdown extends ReapitSearchableDropdownBase {
  hookName: string
  fieldName: string

  constructor({
    context,
    operation,
    settings
  }: GqlOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    this.fieldName = operation.fieldName

    // Dispatch the data-layer generator. The Driver caches by
    // (toIdentifier, toExportPath), so multiple consumers of the same
    // query share one emitted hook file with one import per consumer.
    this.hookName = this.insertOperation(ReapitGraphqlClient, operation).toName()

    this.register({
      imports: {
        react: ['useEffect', 'useMemo', 'useState'],
        'react-hook-form': ['useController'],
        '@hookform/lenses': ['Lens'],
        '@reapit/elements': [
          'Chip',
          'ControlledSearchableDropdown',
          'InputError',
          'Label'
        ]
      }
    })
  }

  override toString(): string {
    return `({ lens, label }: { lens: Lens<string[]>; label?: string }) => {
  const { field, fieldState } = useController(lens.interop())
  const selected: string[] = Array.isArray(field.value) ? field.value : []

  // Three pieces of state:
  //   - searchInput: what the user is typing (immediate)
  //   - debouncedQuery: settled value sent to the API (250ms after last keystroke)
  //   - labelCache: id → human label, populated from every successful response,
  //     so previously-selected chips keep their label after the search clears.
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [labelCache, setLabelCache] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput), 250)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isFetching } = ${this.hookName}({ name: debouncedQuery, pageSize: 10 })
  const rows = data?.${this.fieldName}._embedded ?? []

  // Mirror successful results into the label cache. The ref-shaped
  // setState skips the update when nothing changed so we don't churn
  // renders.
  useEffect(() => {
    setLabelCache(prev => {
      const next = new Map(prev)
      let changed = false
      for (const r of rows) {
        if (r && r.id != null && r.name != null && next.get(r.id) !== r.name) {
          next.set(r.id, r.name)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [rows])

  const select = (id: string) => {
    if (selected.includes(id)) return
    field.onChange([...selected, id])
    setSearchInput('')
    setDebouncedQuery('')
  }

  const remove = (id: string) => {
    field.onChange(selected.filter(s => s !== id))
  }

  // Hide already-selected entries from the results list — clicking them
  // would be a no-op, so don't show them.
  const visibleRows = rows.filter(r => r && r.id != null && !selected.includes(r.id))
  const isResultsListVisible = searchInput.length > 0

  // Disambiguate options that share a name. Reapit's gateway returns
  // multiple offices/negotiators with the same display name; without a
  // suffix the user can't tell them apart in chips or the dropdown.
  // Computed at render time across the cache and current results so the
  // rule reflects every name we've ever seen for this field.
  const labelByValue = useMemo(() => {
    const nameSources = new Map<string, string>()
    for (const [id, name] of labelCache) nameSources.set(id, name)
    for (const r of visibleRows) {
      if (r && r.id != null && r.name != null && !nameSources.has(r.id)) {
        nameSources.set(r.id, r.name)
      }
    }
    const nameCounts = new Map<string, number>()
    for (const name of nameSources.values()) {
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
    }
    const map = new Map<string, string>()
    for (const [id, name] of nameSources) {
      map.set(id, (nameCounts.get(name) ?? 0) > 1 ? \`\${name} (\${id})\` : name)
    }
    return map
  }, [labelCache, visibleRows])

  return (
    <>
      {label && <Label htmlFor={\`\${field.name}-search\`}>{label}</Label>}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
          {selected.map(id => (
            <Chip key={id} hasClose onClick={() => remove(id)}>
              {labelByValue.get(id) ?? id}
            </Chip>
          ))}
        </div>
      )}
      <ControlledSearchableDropdown
        id={\`\${field.name}-search\`}
        value={searchInput}
        onChange={e => setSearchInput(e.target.value)}
        autoComplete="off"
        selectedValue=""
        loading={isFetching}
        resultsList={visibleRows.map(r => ({
          label: (r && r.id != null && labelByValue.get(r.id)) || (r && r.name) || (r && r.id) || '',
          result: r
        }))}
        isResultsListVisible={isResultsListVisible}
        isClearVisible={searchInput.length > 0}
        onResultClick={({ result }) => {
          if (result && result.id != null) select(result.id)
        }}
        onClear={() => { setSearchInput(''); setDebouncedQuery('') }}
      />
      {fieldState.error?.message && <InputError message={fieldState.error.message} />}
    </>
  )
}`
  }
}
