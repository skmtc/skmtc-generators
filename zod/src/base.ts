import { decapitalize, Identifier,  toModelInsertable } from '@skmtc/core'
import type { ModelInsertable, RefName } from '@skmtc/core'
import { join } from '@std/path'

export const ZodBase: ModelInsertable<any> = toModelInsertable({
  id: '@skmtc/zod',

  toIdentifier(refName: RefName): Identifier {
    const name = decapitalize(refName)

    return Identifier.createVariable(name)
  },

  toExportPath(refName: RefName): string {
    const { name } = this.toIdentifier(refName)

    return join('@', 'schemas', `${decapitalize(name)}.generated.tsx`)
  }
})
