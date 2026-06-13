import { toOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import { toFirstSegment } from './toFirstSegment.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const ExpressAppBase = toOasOperationProjectionBase({
  id: denoJson.name,

  toIdentifierName(): string {
    return 'app'
  },

  toIdentifierType: () => ({ kind: 'variable' }),

  toExportPath({ operation, enrichments }): string {
    const firstSegment = toFirstSegment(operation)

    return join('@', `${firstSegment}`, `routes.generated.ts`)
  }
})
