import {
  toOasOperationEntry,
  type DeclaredProjection,
  type IsSupportedOasOperationArgs
} from '@skmtc/core'
import { tanstackQueryProjections } from '@skmtc/gen-tanstack-query-supabase-zod'
import { typescriptProjections } from '@skmtc/gen-typescript'
import { zodProjections } from '@skmtc/gen-zod'
import type { EnrichmentSchema } from './enrichments.ts'
import { toEnrichmentSchema } from './enrichments.ts'
import { ShadcnForm } from './ShadcnForm.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Every projection class gen-shadcn-form can insert: its own, and those of
 * the generators it inserts from.
 */
export const shadcnFormProjections: readonly DeclaredProjection[] = [
  ShadcnForm,
  ...tanstackQueryProjections,
  ...zodProjections,
  ...typescriptProjections
]

export const ShadcnFormEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  projections: shadcnFormProjections,

  isSupported({ operation }: IsSupportedOasOperationArgs) {
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
      name: ShadcnForm.toIdentifierName({ operation, enrichments, variant }),
      exportPath: ShadcnForm.toExportPath({ operation, enrichments, variant })
    }
  },

  toEnrichmentSchema
})
