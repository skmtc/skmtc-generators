import { Identifier, toGeneratorOnlyKey, type GqlOperationProjectionConstructorArgs } from '@skmtc/core'
import { ReapitMultiSelectBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

const id = denoJson.name

const stripGetPrefix = (name: string): string => (name.startsWith('Get') ? name.slice(3) : name)

const singularize = (plural: string): string => {
  if (plural.endsWith('ies') && plural.length > 3) return plural.slice(0, -3) + 'y'
  if (plural.endsWith('ses') && plural.length > 3) return plural.slice(0, -2)
  if (plural.endsWith('s') && plural.length > 1) return plural.slice(0, -1)
  return plural
}

/**
 * GraphQL Query → Reapit Elements `<MultiSelect>` component generator.
 *
 * Emits a self-contained React component per qualifying query. Uses
 * Reapit Elements v4's native MultiSelect compound (MultiSelect /
 * MultiSelectSelected / MultiSelectUnSelected / MultiSelectChip) so the
 * output looks and behaves like a hand-authored Reapit Elements form
 * field — chip styling, hover states, keyboard nav, theming all come
 * from the library.
 *
 * Composes with `gen-reapit-form` via the operation-reference protocol
 * with `referenceKind: 'multiselect'`.
 */
export class ReapitMultiSelect extends ReapitMultiSelectBase {
  rowTypeName: string
  queryConstName: string

  constructor({ context, operation, settings }: GqlOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const stripped = stripGetPrefix(operation.fieldName)
    this.rowTypeName = `${singularize(stripped)}MultiSelectRow`
    this.queryConstName = `${stripped.toUpperCase()}_MULTISELECT_QUERY`

    this.register({
      imports: {
        react: ['useEffect', 'useState'],
        'react-hook-form': ['useController'],
        '@hookform/lenses': ['Lens'],
        '@reapit/elements': [
          'Label',
          'MultiSelect',
          'MultiSelectSelected',
          'MultiSelectUnSelected',
          'MultiSelectChip',
          'elHasGreyChips'
        ],
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

    const queryBody = `query ${stripped}MultiSelect {
  ${operation.fieldName}(pageSize: 1000) {
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
    const rowType = this.rowTypeName
    const queryConst = this.queryConstName
    const fieldName = this.operation.fieldName

    return `({ lens, label }: { lens: Lens<string[]>; label?: string }) => {
  const { field, fieldState } = useController(lens.interop())
  const selected: string[] = Array.isArray(field.value) ? field.value : []

  const [options, setOptions] = useState<${rowType}[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    gqlRequest<{ ${fieldName}: { _embedded: ${rowType}[] | null } }>(${queryConst})
      .then(data => {
        if (cancelled) return
        setOptions(data.${fieldName}._embedded ?? [])
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load options')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      field.onChange(selected.filter(v => v !== value))
    } else {
      field.onChange([...selected, value])
    }
  }

  const selectedOptions = options.filter(o => o.id !== null && selected.includes(o.id))
  const unselectedOptions = options.filter(o => o.id !== null && !selected.includes(o.id))

  return (
    <>
      {label && <Label>{label}</Label>}
      <MultiSelect>
        <MultiSelectSelected role="listbox" aria-label={\`Selected \${label ?? ''}\`.trim()}>
          {selectedOptions.length === 0 ? (
            <p>{loading ? 'Loading…' : 'Please select from the options below'}</p>
          ) : (
            selectedOptions.map(opt => (
              <MultiSelectChip
                key={opt.id}
                id={\`\${field.name}-selected-\${opt.id}\`}
                checked
                onChange={() => toggle(opt.id ?? '')}
              >
                {opt.name ?? opt.id}
              </MultiSelectChip>
            ))
          )}
        </MultiSelectSelected>
        {unselectedOptions.length > 0 && (
          <MultiSelectUnSelected role="listbox" aria-label={\`Available \${label ?? ''}\`.trim()}>
            {unselectedOptions.map(opt => (
              <MultiSelectChip
                key={opt.id}
                id={\`\${field.name}-unselected-\${opt.id}\`}
                className={elHasGreyChips}
                checked={false}
                onChange={() => toggle(opt.id ?? '')}
              >
                {opt.name ?? opt.id}
              </MultiSelectChip>
            ))}
          </MultiSelectUnSelected>
        )}
      </MultiSelect>
      {error && <p style={{ color: '#b00', fontSize: '0.8125rem' }}>{error}</p>}
      {fieldState.error && (
        <p style={{ color: '#b00', fontSize: '0.8125rem' }}>{fieldState.error.message}</p>
      )}
    </>
  )
}`
  }
}
