import { capitalize, decapitalize, camelCase } from '@skmtc/core'
import { toModelProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'

export const TypescriptBase = toModelProjectionBase({
  id: '@skmtc/gen-typescript',

  toIdentifierName({ refName }): string {
    return capitalize(camelCase(refName))
  },

  toIdentifierType: () => ({ kind: 'type' }),

  toExportPath({ refName, enrichments, variant }): string {
    const name = this.toIdentifierName({ refName, enrichments, variant })

    return join('@', 'types', `${decapitalize(name)}.generated.ts`)
  }
})
