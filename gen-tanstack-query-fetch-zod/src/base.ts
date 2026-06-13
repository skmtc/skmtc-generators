import { capitalize, toEndpointName } from '@skmtc/core'
import { toOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import denoJson from '../deno.json' with { type: 'json' }

export const TanstackQueryBase = toOasOperationProjectionBase({
  id: denoJson.name,

  toIdentifierName({ operation }): string {
    return `use${capitalize(toEndpointName(operation))}`
  },

  toIdentifierType: () => ({ kind: 'variable' }),

  toExportPath({ operation, enrichments, variant }): string {
    const name = this.toIdentifierName({ operation, enrichments, variant })

    return join('@', 'services', `${name}.generated.ts`)
  }
})
