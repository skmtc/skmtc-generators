import { decapitalize, Identifier, type RefName, camelCase } from '@skmtc/core'
import { toModelProjectionBase, createVariable } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import denoJson from '../deno.json' with { type: 'json' }

export const ArktypeBase = toModelProjectionBase({
  id: denoJson.name,

  toIdentifier({ refName }): Identifier {
    const name = decapitalize(camelCase(refName))

    return createVariable(name)
  },

  toExportPath({ refName, enrichments, variant }): string {
    const { name } = this.toIdentifier({ refName, enrichments, variant })

    return join('@', 'types', `${decapitalize(name)}.generated.ts`)
  }
})