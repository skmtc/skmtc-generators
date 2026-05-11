import invariant from 'tiny-invariant'
import { SupabaseHono } from './SupabaseHono.ts'
import { toOasOperationEntry } from '@skmtc/core'
import denoJson from '../deno.json' with { type: 'json' }

export const supabaseHonoEntry = toOasOperationEntry({
  id: denoJson.name,
  transform: ({ context, operation }) => {
    const enrichments = SupabaseHono.toEnrichments({ operation, context })
    const app =
      context.findDefinition({
        name: 'app',
        exportPath: SupabaseHono.toExportPath({ operation, enrichments })
      }) ?? context.insertOperation({ projection: SupabaseHono, operation: operation }).definition

    invariant(app?.value instanceof SupabaseHono, 'app must be an instance of SupabaseHono')

    app.value.append(operation)
  }
})
