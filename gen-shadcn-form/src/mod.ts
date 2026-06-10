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

  transform({ context, operation, variant }) {
    // Thread the engine's variant through to the Driver so the form's
    // ContentSettings carries it. Without this, every variant would
    // construct as `'main'` and collide on the second variant via the
    // `Registered definition mismatch` integrity check.
    context.insertOperation({ projection: ShadcnForm, operation, variant })
  },

  toPreviewModule: ({ context, operation, variant }) => {
    const enrichments = ShadcnForm.toEnrichments({ operation, context, variant })
    return {
      name: ShadcnForm.toIdentifier({ operation, enrichments, variant }).name,
      exportPath: ShadcnForm.toExportPath({ operation, enrichments, variant })
    }
  },

  toEnrichmentSchema
})
