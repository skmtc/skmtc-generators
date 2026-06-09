import invariant from 'tiny-invariant'
import { SupabaseHono } from './SupabaseHono.ts'
import { toOasOperationEntry } from '@skmtc/core'
import { typescript } from '@skmtc/lang-typescript'
import denoJson from '../deno.json' with { type: 'json' }

export const supabaseHonoEntry = toOasOperationEntry({
  id: denoJson.name,
  lang: typescript,
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
