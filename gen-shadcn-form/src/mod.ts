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
    context.insertOperation({ projection: ShadcnForm, operation: operation })
  },

  toPreviewModule: ({ context, operation }) => {
    const enrichments = ShadcnForm.toEnrichments({ operation, context })
    return {
      name: ShadcnForm.toIdentifier({ operation, enrichments }).name,
      exportPath: ShadcnForm.toExportPath({ operation, enrichments })
    }
  },

  toEnrichmentSchema
})
