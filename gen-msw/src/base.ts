import { camelCase } from '@skmtc/core'
import { toOasOperationProjectionBase } from '@skmtc/lang-typescript'
import { join } from '@std/path'
import denoJson from '../deno.json' with { type: 'json' }

export const MswBase = toOasOperationProjectionBase({
  id: denoJson.name,

  toIdentifierName({ operation }): string {
    const { method, path } = operation
    const name = `${method}${camelCase(path, { upperFirst: true })}Handler`

    return name
  },

  toIdentifierType: () => ({ kind: 'variable' }),

  toExportPath(): string {
    return join('@', 'mocks', `handlers.generated.ts`)
  }
})
