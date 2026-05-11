import { capitalize, Identifier, toEndpointName, toOasOperationProjectionBase } from '@skmtc/core'
import { join } from '@std/path'
import denoJson from '../deno.json' with { type: 'json' }

export const TanstackQueryBase = toOasOperationProjectionBase({
  id: denoJson.name,

  toIdentifier({ operation }): Identifier {
    const name = `use${capitalize(toEndpointName(operation))}`

    return Identifier.createVariable(name)
  },

  toExportPath({ operation, enrichments }): string {
    const { name } = this.toIdentifier({ operation, enrichments })

    return join('@', 'services', `${name}.generated.ts`)
  }
})
