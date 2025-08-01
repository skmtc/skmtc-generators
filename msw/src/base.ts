import { Identifier, toOperationBase, camelCase } from '@skmtc/core'
import { join } from '@std/path'

export const MswBase = toOperationBase({
  id: '@skmtc/msw',

  toIdentifier({ method, path }): Identifier {
    const name = `${method}${camelCase(path, { upperFirst: true })}Handler`

    return Identifier.createVariable(name)
  },

  toExportPath(): string {
    return join('@', 'mocks', `handlers.generated.ts`)
  }
})
