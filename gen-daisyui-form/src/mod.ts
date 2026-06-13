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

  transform({ context, operation, variant }) {
    context.insertOperation({ projection: DaisyForm, operation, variant })
  },

  toPreviewModule: ({ context, operation, variant }) => {
    const enrichments = DaisyForm.toEnrichments({ operation, context, variant })
    return {
      name: DaisyForm.toIdentifierName({ operation, enrichments, variant }),
      exportPath: DaisyForm.toExportPath({ operation, enrichments, variant })
    }
  },

  toEnrichmentSchema
})
