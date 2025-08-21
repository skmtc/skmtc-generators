import { capitalize, decapitalize, Identifier, toModelBase, camelCase } from '@skmtc/core'
import type { RefName } from '@skmtc/core'
import { join } from '@std/path'

export const TypescriptBase = toModelBase({
  id: '@skmtc/gen-typescript',

  toIdentifier(refName: RefName): Identifier {
    const name = capitalize(camelCase(refName))

    return Identifier.createType(name)
  },

  toExportPath(refName: RefName): string {
    const { name } = this.toIdentifier(refName)

    return join('@', 'types', `${decapitalize(name)}.generated.ts`)
  }
})
