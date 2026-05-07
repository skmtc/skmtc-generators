import { Identifier, toOasOperationProjectionBase } from '@skmtc/core'
import { join } from '@std/path'
import { toFirstSegment } from './toFirstSegment.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ExpressAppBase = toOasOperationProjectionBase({
  id: denoJson.name,

  toIdentifier(): Identifier {
    return Identifier.createVariable('app')
  },

  toExportPath(operation): string {
    const firstSegment = toFirstSegment(operation)

    return join('@', `${firstSegment}`, `routes.generated.ts`)
  }
})
