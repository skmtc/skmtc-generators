import { decapitalize, Identifier, toModelProjectionBase, type RefName, camelCase } from '@skmtc/core'
import { join } from '@std/path'
import denoJson from '../deno.json' with { type: 'json' }

export const ValibotBase = toModelProjectionBase({
  id: denoJson.name,

  toIdentifier({ refName }): Identifier {
    const name = decapitalize(camelCase(refName))

    return Identifier.createVariable(name)
  },

  toExportPath({ refName, enrichments }): string {
    const { name } = this.toIdentifier({ refName, enrichments })

    return join('@', 'types', `${decapitalize(name)}.generated.ts`)
  }
})