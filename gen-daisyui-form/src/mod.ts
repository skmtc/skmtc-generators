import { toOasOperationEntry, type IsSupportedOasOperationConfigArgs } from '@skmtc/core'
import { DaisyForm } from './DaisyForm.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const daisyFormEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  isSupported({ operation }: IsSupportedOasOperationConfigArgs<EnrichmentSchema>) {
    return (
      ['post', 'put', 'patch'].includes(operation.method) &&
      Boolean(operation.requestBody?.resolve()?.toSchema()?.resolve().type === 'object')
    )
  },

  transform({ context, operation }) {
    context.insertOperation({ projection: DaisyForm, operation: operation })
  },

  toPreviewModule: ({ operation }) => ({
    name: DaisyForm.toIdentifier(operation).name,
    exportPath: DaisyForm.toExportPath(operation),
    group: 'forms'
  }),

  toEnrichmentSchema
})
