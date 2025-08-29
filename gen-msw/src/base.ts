import { Identifier, toOperationBase, camelCase } from '@skmtc/core'
import { join } from '@std/path'
import denoJson from '../deno.json' with { type: 'json' }

export const MswBase = toOperationBase({
  id: denoJson.name,

  toIdentifier({ method, path }): Identifier {
    const name = `${method}${camelCase(path, { upperFirst: true })}Handler`

    return Identifier.createVariable(name)
  },

  toExportPath(): string {
    return join('@', 'mocks', `handlers.generated.ts`)
  }
})
