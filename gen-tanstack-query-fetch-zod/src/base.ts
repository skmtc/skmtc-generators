import { capitalize, Identifier, toEndpointName, toOasOperationBase } from '@skmtc/core'
import { join } from '@std/path'
import denoJson from '../deno.json' with { type: 'json' }

export const TanstackQueryBase = toOasOperationBase({
  id: denoJson.name,

  toIdentifier(operation): Identifier {
    const name = `use${capitalize(toEndpointName(operation))}`

    return Identifier.createVariable(name)
  },

  toExportPath(operation): string {
    const { name } = this.toIdentifier(operation)

    return join('@', 'services', `${name}.generated.ts`)
  }
})
