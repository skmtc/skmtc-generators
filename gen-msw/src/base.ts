import { Identifier, toOasOperationProjectionBase, camelCase } from '@skmtc/core'
import { typescript } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import denoJson from '../deno.json' with { type: 'json' }

export const MswBase = toOasOperationProjectionBase({
  id: denoJson.name,
  lang: typescript,

  toIdentifier({ operation }): Identifier {
    const { method, path } = operation
    const name = `${method}${camelCase(path, { upperFirst: true })}Handler`

    return Identifier.createVariable(name)
  },

  toExportPath(): string {
    return join('@', 'mocks', `handlers.generated.ts`)
  }
})
