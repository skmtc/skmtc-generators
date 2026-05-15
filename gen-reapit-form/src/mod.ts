import {
  synthesizeArgsObject,
  toGqlOperationEntry,
  type IsSupportedGqlOperationConfigArgs
} from '@skmtc/core'
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

  isSupported({ operation }: IsSupportedGqlOperationConfigArgs<EnrichmentSchema>) {
    return operation.rootKind === 'mutation' && synthesizeArgsObject(operation) !== undefined
  },

  transform({ context, operation, acc, variant }) {
    if (operation.rootKind !== 'mutation') return acc
    if (synthesizeArgsObject(operation) === undefined) return acc

    context.insertOperation({ projection: ReapitForm, operation, variant })

    return acc
  },

  toPreviewModule: ({ context, operation, variant }) => {
    const enrichments = ReapitForm.toEnrichments({ operation, context, variant })
    return {
      name: ReapitForm.toIdentifier({ operation, enrichments, variant }).name,
      exportPath: ReapitForm.toExportPath({ operation, enrichments, variant })
    }
  },

  toEnrichmentSchema
})
