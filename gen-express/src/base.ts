import { Identifier, toOperationBase } from '@skmtc/core'
import { join } from '@std/path'
import { toFirstSegment } from './toFirstSegment.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ExpressAppBase = toOperationBase({
  id: denoJson.name,

  toIdentifier(): Identifier {
    return Identifier.createVariable('app')
  },

  toExportPath(operation): string {
    const firstSegment = toFirstSegment(operation)

    return join('@', `${firstSegment}`, `routes.generated.ts`)
  }
})
