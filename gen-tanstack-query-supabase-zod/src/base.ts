import { capitalize, Identifier, toEndpointName } from '@skmtc/core'
import { toOasOperationProjectionBase, createVariable } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import denoJson from '../deno.json' with { type: 'json' }

export const TanstackQueryBase = toOasOperationProjectionBase({
  id: denoJson.name,

  toIdentifier({ operation }): Identifier {
    const name = `use${capitalize(toEndpointName(operation))}`

    return createVariable(name)
  },

  toExportPath({ operation, enrichments, variant }): string {
    const { name } = this.toIdentifier({ operation, enrichments, variant })

    return join('@', 'services', `${name}.generated.ts`)
  }
})
