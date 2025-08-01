import { toOperationEntry, type IsSupportedOperationConfigArgs } from '@skmtc/core'
import type { EnrichmentSchema } from './enrichments.ts'
import { toEnrichmentSchema } from './enrichments.ts'
import { ShadcnForm } from './ShadcnForm.ts'
export const ShadcnFormEntry = toOperationEntry<EnrichmentSchema>({
  id: ShadcnForm.id,

  isSupported({ operation }: IsSupportedOperationConfigArgs<EnrichmentSchema>) {
    const schema = operation.toSuccessResponse()?.resolve().toSchema()

    return (
      Boolean(schema?.isRef()) &&
      ['post', 'put', 'patch'].includes(operation.method) &&
      Boolean(operation.requestBody?.resolve()?.toSchema())
    )
  },

  transform({ context, operation }) {
    context.insertOperation(ShadcnForm, operation)
  },

  toPreviewModule: ({ operation }) => ({
    name: ShadcnForm.toIdentifier(operation).name,
    exportPath: ShadcnForm.toExportPath(operation),
    group: 'forms',
  }),

  toEnrichmentSchema,
})
