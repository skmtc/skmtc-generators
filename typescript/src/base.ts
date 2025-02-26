import { capitalize, decapitalize, Identifier, toModelInsertable } from '@skmtc/core'
import { join } from '@std/path'
import type { ModelInsertable, RefName } from '@skmtc/core'

export const TypescriptBase: ModelInsertable<any> = toModelInsertable({
  id: '@skmtc/typescript',

  toIdentifier(refName: RefName): Identifier {
    const name = capitalize(refName)

    return Identifier.createType(name)
  },

  toExportPath(refName: RefName): string {
    const { name } = this.toIdentifier(refName)

    return join('@', 'schemas', `${decapitalize(name)}.generated.tsx`)
  }
})
