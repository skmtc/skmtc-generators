import { toGqlOperationEntry, type IsSupportedGqlOperationConfigArgs } from '@skmtc/core'
import { ReapitMultiSelect } from './ReapitMultiSelect.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * gen-reapit-multi-select: produces one `<XMultiSelectField>` per
 * qualifying GraphQL Query (paged result with `_embedded: [{ id, name }]`).
 * Output is a self-contained React component — the generated file owns
 * the GraphQL query, RHF wiring, selected-chip rendering (Reapit
 * `<Chip>`), and the unselected-options checkbox list. No hand-written
 * widget is required in the consumer.
 *
 * Sibling to `gen-reapit-searchable-dropdown` — same predicate, same
 * operation-reference protocol, different output shape. The form
 * generator picks which producer to insert via the per-field
 * `referenceKind` enrichment (`'multiselect' | 'searchable'`).
 */
export const reapitMultiSelectEntry = toGqlOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  isSupported({ context, operation }: IsSupportedGqlOperationConfigArgs<EnrichmentSchema>) {
    return ReapitMultiSelect.isSupported({ context, operation })
  },

  transform({ context, operation, variant }) {
    if (!ReapitMultiSelect.isSupported({ context, operation })) return
    context.insertOperation({ projection: ReapitMultiSelect, operation, variant })
  },

  toPreviewModule: ({ context, operation, variant }) => {
    const enrichments = ReapitMultiSelect.toEnrichments({ operation, context, variant })
    return {
      name: ReapitMultiSelect.toIdentifier({ operation, enrichments, variant }).name,
      exportPath: ReapitMultiSelect.toExportPath({ operation, enrichments, variant })
    }
  },

  toEnrichmentSchema
})
