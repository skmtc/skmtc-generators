import { synthesizeArgsObject, toGqlOperationEntry, type IsSupportedGqlOperationArgs } from '@skmtc/core'
import { ReapitForm } from './ReapitForm.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * gen-reapit-form: emits one React form component per GraphQL **Mutation**
 * root field, using `@reapit/elements` form primitives, `react-hook-form` +
 * `@hookform/lenses` for state, and a Zod resolver derived from the args
 * object via `gen-zod`.
 */
export const reapitFormEntry = toGqlOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  isSupported({ operation }: IsSupportedGqlOperationArgs) {
    return operation.rootKind === 'mutation' && synthesizeArgsObject(operation) !== undefined
  },

  transform({ context, operation, variant }) {
    if (operation.rootKind !== 'mutation') return
    if (synthesizeArgsObject(operation) === undefined) return

    context.insertOperation({ projection: ReapitForm, operation, variant })
  },

  toPreviewModule: ({ context, operation, variant }) => {
    const enrichments = ReapitForm.toEnrichments({ operation, context, variant })
    return {
      name: ReapitForm.toIdentifierName({ operation, enrichments, variant }),
      exportPath: ReapitForm.toExportPath({ operation, enrichments, variant })
    }
  },

  toEnrichmentSchema
})
