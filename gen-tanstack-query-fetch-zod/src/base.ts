import { capitalize, Identifier, toEndpointName, toOasOperationProjectionBase } from '@skmtc/core'
import { typescript } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import denoJson from '../deno.json' with { type: 'json' }

export const TanstackQueryBase = toOasOperationProjectionBase({
  id: denoJson.name,
  lang: typescript,

  toIdentifier({ operation }): Identifier {
    const name = `use${capitalize(toEndpointName(operation))}`

    return Identifier.createVariable(name)
  },

  toExportPath({ operation, enrichments, variant }): string {
    const { name } = this.toIdentifier({ operation, enrichments, variant })

    return join('@', 'services', `${name}.generated.ts`)
  }
})
