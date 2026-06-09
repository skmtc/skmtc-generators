import { capitalize, decapitalize, Identifier, toModelProjectionBase, camelCase } from '@skmtc/core'
import type { RefName } from '@skmtc/core'
import { join } from '@std/path'

export const TypescriptBase = toModelProjectionBase({
  id: '@skmtc/gen-typescript',

  toIdentifier({ refName }): Identifier {
    const name = capitalize(camelCase(refName))

    return Identifier.createType(name)
  },

  toExportPath({ refName, enrichments, variant }): string {
    const { name } = this.toIdentifier({ refName, enrichments, variant })

    return join('@', 'types', `${decapitalize(name)}.generated.ts`)
  }
})
