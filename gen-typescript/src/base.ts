import { capitalize, decapitalize, Identifier, toModelBase, camelCase } from '@skmtc/core'
import type { RefName } from '@skmtc/core'
import { join } from '@std/path'
import denoJson from '../deno.json' with { type: 'json' }

export const TypescriptBase = toModelBase({
  id: denoJson.name,

  toIdentifier(refName: RefName): Identifier {
    const name = capitalize(camelCase(refName))

    return Identifier.createType(name)
  },

  toExportPath(refName: RefName): string {
    const { name } = this.toIdentifier(refName)

    return join('@', 'types', `${decapitalize(name)}.generated.ts`)
  }
})
