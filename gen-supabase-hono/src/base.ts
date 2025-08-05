import { Identifier, toOperationBase } from '@skmtc/core'
import { join } from '@std/path'
import { toFirstSegment } from './toFirstSegment.ts'

export const SupabaseHonoBase = toOperationBase({
  id: '@skmtc/gen-supabase-hono',

  toIdentifier(): Identifier {
    return Identifier.createVariable('app')
  },

  toExportPath(operation): string {
    const firstSegment = toFirstSegment(operation)

    return join('@', 'supabase', 'functions', `${firstSegment}.generated.ts`)
  }
})
