import { Identifier, toOasOperationProjectionBase } from '@skmtc/core'
import { typescript } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toFirstSegment } from './toFirstSegment.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const SupabaseHonoBase = toOasOperationProjectionBase({
  id: denoJson.name,
  lang: typescript,

  toIdentifier(): Identifier {
    return Identifier.createVariable('app')
  },

  toExportPath({ operation, enrichments }): string {
    const firstSegment = toFirstSegment(operation)

    return join('@', `${firstSegment}`, `api.generated.ts`)
  }
})
