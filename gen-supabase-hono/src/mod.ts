import invariant from 'tiny-invariant'
import { SupabaseHono } from './SupabaseHono.ts'
import { toOasOperationEntry } from '@skmtc/core'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const supabaseHonoEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  // Hono has no `app.query` route method for the 3.2 `query` method.
  isSupported({ operation }) {
    return ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(operation.method)
  },
  transform: ({ context, operation, variant }) => {
    const enrichments = SupabaseHono.toEnrichments({ operation, context, variant })
    const app =
      context.findDefinition({
        name: 'app',
        exportPath: SupabaseHono.toExportPath({ operation, enrichments, variant })
      }) ?? context.insertOperation({ projection: SupabaseHono, operation, variant }).definition

    invariant(app?.value instanceof SupabaseHono, 'app must be an instance of SupabaseHono')

    app.value.append(operation)
  }
})
