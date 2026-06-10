import { Identifier, camelCase } from '@skmtc/core'
import { toOasOperationProjectionBase, createVariable } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import denoJson from '../deno.json' with { type: 'json' }

export const MswBase = toOasOperationProjectionBase({
  id: denoJson.name,

  toIdentifier({ operation }): Identifier {
    const { method, path } = operation
    const name = `${method}${camelCase(path, { upperFirst: true })}Handler`

    return createVariable(name)
  },

  toExportPath(): string {
    return join('@', 'mocks', `handlers.generated.ts`)
  }
})
