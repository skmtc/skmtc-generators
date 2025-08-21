import { decapitalize, Identifier, toModelBase, type RefName, camelCase } from '@skmtc/core'
import { join } from '@std/path'

export const ZodBase = toModelBase({
  id: '@skmtc/gen-zod',

  toIdentifier(refName: RefName): Identifier {
    const name = decapitalize(camelCase(refName))

    return Identifier.createVariable(name)
  },

  toExportPath(refName: RefName): string {
    const { name } = this.toIdentifier(refName)

    return join('@', 'types', `${decapitalize(name)}.generated.ts`)
  }
})
