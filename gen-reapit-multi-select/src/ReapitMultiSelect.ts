import { type GqlOperationProjectionConstructorArgs } from '@skmtc/core'
import { ReapitGraphqlClient } from '@skmtc/gen-reapit-graphql-client'
import { ReapitMultiSelectBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'

/**
 * GraphQL Query → Reapit Elements `<MultiSelect>` component generator.
 *
 * Emits a self-contained React component per qualifying query. Uses
 * Reapit Elements v4's native MultiSelect compound (MultiSelect /
 * MultiSelectSelected / MultiSelectUnSelected / MultiSelectChip) for
 * UI, and dispatches `gen-reapit-graphql-client` for the data layer
 * via the operation-reference protocol — so the emitted component
 * pulls in `useGetX()` (a React Query hook backed by graphql-request)
 * rather than inlining a fetch + useEffect/useState.
 *
 * Adds three bulk-action affordances above the chip list:
 *   - "X of Y selected" count
 *   - Select-all (only enabled when there are unselected items)
 *   - Clear-all (only enabled when something is selected)
 *
 * Disambiguates options that share a name by appending the id —
 * Reapit's gateway returns multiple offices/negotiators with the same
 * display name, and an undecorated chip list can't tell them apart.
 *
 * Composes with `gen-reapit-form` via the operation-reference protocol
 * with `referenceKind: 'multiselect'`.
 */
export class ReapitMultiSelect extends ReapitMultiSelectBase {
  hookName: string
  fieldName: string

  constructor({ context, operation, settings }: GqlOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    this.fieldName = operation.fieldName

    // Dispatch the data-layer generator. The Driver caches by
    // (toIdentifier, toExportPath), so multiple consumers of the same
    // query share one emitted hook file with one import per consumer.
    // destinationPath defaults to this.settings.exportPath via the base.
    this.hookName = this.insertOperation(ReapitGraphqlClient, operation).toName()

    this.register({
      imports: {
        react: ['useMemo'],
        'react-hook-form': ['useController'],
        '@hookform/lenses': ['Lens'],
        '@reapit/elements': [
          'Button',
          'InputError',
          'Label',
          'MultiSelect',
          'MultiSelectSelected',
          'MultiSelectUnSelected',
          'MultiSelectChip',
          'SmallText',
          'elHasGreyChips'
        ]
      }
    })
  }

  override toString(): string {
    return `({ lens, label }: { lens: Lens<string[]>; label?: string }) => {
  const { field, fieldState } = useController(lens.interop())
  const selected: string[] = Array.isArray(field.value) ? field.value : []

  // pageSize: 1000 because v4 MultiSelect renders all options inline.
  // For unbounded entity sets, prefer gen-reapit-searchable-dropdown
  // which fires one query per keystroke.
  const { data, isLoading, error } = ${this.hookName}({ pageSize: 1000 })
  const options = data?.${this.fieldName}._embedded ?? []

  // Build id → display label, decorating duplicate names with the id
  // so a list with multiple "Barbuck"s doesn't render indistinguishable
  // chips. Computed at render time from the option set so the rule
  // reflects the current data exactly.
  const labelByValue = useMemo(() => {
    const nameCounts = new Map<string, number>()
    for (const o of options) {
      if (o && o.name) nameCounts.set(o.name, (nameCounts.get(o.name) ?? 0) + 1)
    }
    const map = new Map<string, string>()
    for (const o of options) {
      if (!o || o.id == null) continue
      const name = o.name ?? o.id
      const ambiguous = o.name != null && (nameCounts.get(o.name) ?? 0) > 1
      map.set(o.id, ambiguous ? \`\${name} (\${o.id})\` : name)
    }
    return map
  }, [options])

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      field.onChange(selected.filter(v => v !== value))
    } else {
      field.onChange([...selected, value])
    }
  }

  const selectAll = () => {
    const allIds = options
      .map(o => (o ? o.id : null))
      .filter((id): id is string => id != null)
    field.onChange(allIds)
  }

  const clearAll = () => field.onChange([])

  const selectedOptions = options.filter(o => o && o.id != null && selected.includes(o.id))
  const unselectedOptions = options.filter(o => o && o.id != null && !selected.includes(o.id))

  return (
    <>
      {label && <Label>{label}</Label>}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
        <SmallText hasNoMargin hasGreyText>
          {selected.length} of {options.length} selected
        </SmallText>
        <Button
          type="button"
          intent="default"
          buttonSize="small"
          disabled={unselectedOptions.length === 0 || isLoading}
          onClick={selectAll}
        >
          Select all
        </Button>
        <Button
          type="button"
          intent="default"
          buttonSize="small"
          disabled={selected.length === 0}
          onClick={clearAll}
        >
          Clear all
        </Button>
      </div>
      <MultiSelect>
        <MultiSelectSelected role="listbox" aria-label={\`Selected \${label ?? ''}\`.trim()}>
          {selectedOptions.length === 0 ? (
            <p>{isLoading ? 'Loading…' : 'Please select from the options below'}</p>
          ) : (
            selectedOptions.map(opt => (
              <MultiSelectChip
                key={opt.id}
                id={\`\${field.name}-selected-\${opt.id}\`}
                checked
                onChange={() => toggle(opt.id ?? '')}
              >
                {labelByValue.get(opt.id ?? '') ?? opt.id}
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
                {labelByValue.get(opt.id ?? '') ?? opt.id}
              </MultiSelectChip>
            ))}
          </MultiSelectUnSelected>
        )}
      </MultiSelect>
      {error && (
        <InputError message={error instanceof Error ? error.message : 'Failed to load options'} />
      )}
      {fieldState.error?.message && <InputError message={fieldState.error.message} />}
    </>
  )
}`
  }
}
