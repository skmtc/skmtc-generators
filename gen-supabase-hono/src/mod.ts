import invariant from 'tiny-invariant'
import { SupabaseHono } from './SupabaseHono.ts'
import { toOasOperationEntry, type Method } from '@skmtc/core'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/** The methods Hono has an `app.<method>` route method for. */
const honoMethods: readonly Method[] = ['get', 'put', 'post', 'delete', 'options', 'patch']

export const supabaseHonoEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  isSupported({ operation }) {
    return honoMethods.includes(operation.method)
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
