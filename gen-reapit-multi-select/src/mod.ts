import {
  toGqlOperationEntry,
  type IsSupportedGqlOperationConfigArgs
} from '@skmtc/core'
import { ReapitMultiSelect } from './ReapitMultiSelect.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * gen-reapit-multi-select: emits one `<XMultiSelectField>` per qualifying
 * GraphQL Query (paged result with `_embedded: [{ id, name }]`). Output
 * is a self-contained React component — the emitted file owns the
 * GraphQL query, RHF wiring, selected-chip rendering (Reapit `<Chip>`),
 * and the unselected-options checkbox list. No hand-written widget is
 * required in the consumer.
 *
 * Sibling to `gen-reapit-searchable-dropdown` — same predicate, same
 * dispatch protocol, different output shape. The form generator picks
 * which producer to dispatch via the per-field `referenceKind`
 * enrichment (`'multiselect' | 'searchable'`).
 */
export const reapitMultiSelectEntry = toGqlOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  isSupported({ context, operation }: IsSupportedGqlOperationConfigArgs<EnrichmentSchema>) {
    return ReapitMultiSelect.isSupported({ context, operation })
  },

  transform({ context, operation, acc }) {
    if (!ReapitMultiSelect.isSupported({ context, operation })) return acc
    context.insertOperation({ insertable: ReapitMultiSelect, operation })
    return acc
  },

  toPreviewModule: ({ operation }) => ({
    name: ReapitMultiSelect.toIdentifier(operation).name,
    exportPath: ReapitMultiSelect.toExportPath(operation),
    group: 'forms'
  }),

  toEnrichmentSchema
})
