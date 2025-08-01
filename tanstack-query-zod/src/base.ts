import { capitalize, Identifier, toEndpointName, toOperationBase } from '@skmtc/core'
import { join } from '@std/path'

export const TanstackQueryBase = toOperationBase({
  id: '@skmtc/tanstack-query-zod',

  toIdentifier(operation): Identifier {
    const name = `use${capitalize(toEndpointName(operation))}`

    return Identifier.createVariable(name)
  },

  toExportPath(operation): string {
    const { name } = this.toIdentifier(operation)

    return join('@', 'services', `${name}.generated.ts`)
  }
})
