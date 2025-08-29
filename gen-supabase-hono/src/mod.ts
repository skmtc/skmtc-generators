import invariant from 'tiny-invariant'
import { SupabaseHono } from './SupabaseHono.ts'
import { toOperationEntry } from '@skmtc/core'
import denoJson from '../deno.json' with { type: 'json' }

export const supabaseHonoEntry = toOperationEntry({
  id: denoJson.name,
  transform: ({ context, operation }) => {
    const app =
      context.findDefinition({
        name: 'app',
        exportPath: SupabaseHono.toExportPath(operation)
      }) ?? context.insertOperation(SupabaseHono, operation).definition

    invariant(app?.value instanceof SupabaseHono, 'app must be an instance of SupabaseHono')

    app.value.append(operation)
  }
})
