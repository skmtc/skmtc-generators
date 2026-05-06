import { toOasOperationEntry, type IsSupportedOasOperationConfigArgs } from '@skmtc/core'
import type { EnrichmentSchema } from './enrichments.ts'
import { toEnrichmentSchema } from './enrichments.ts'
import { ShadcnForm } from './ShadcnForm.ts'
import denoJson from '../deno.json' with { type: 'json' }
export const ShadcnFormEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  isSupported({ operation }: IsSupportedOasOperationConfigArgs<EnrichmentSchema>) {
    return (
      ['post', 'put', 'patch'].includes(operation.method) &&
      Boolean(operation.requestBody?.resolve()?.toSchema()?.resolve().type === 'object')
    )
  },

  transform({ context, operation }) {
    context.insertOperation({ insertable: ShadcnForm, operation: operation })
  },

  toPreviewModule: ({ operation }) => ({
    name: ShadcnForm.toIdentifier(operation).name,
    exportPath: ShadcnForm.toExportPath(operation),
    group: 'forms'
  }),

  toEnrichmentSchema
})
