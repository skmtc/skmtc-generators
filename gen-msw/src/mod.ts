import { Identifier, toOasOperationEntry } from '@skmtc/core'
import { typescript } from '@skmtc/lang-typescript'
import { MockRoute } from './MockRoute.ts'
import { MockRoutesList } from './MockRoutesList.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const MswEntry = toOasOperationEntry({
  id: denoJson.name,

  transform: ({ context, operation }) => {
    const insertedRoute = context.insertOperation({ projection: MockRoute, operation: operation })

    const { exportPath } = insertedRoute.settings

    const route = insertedRoute.toName()

    if (!route) {
      return
    }

    const existingRoutesList = context.findDefinition({ name: 'toRoutesList', exportPath })

    if (existingRoutesList?.value instanceof MockRoutesList) {
      existingRoutesList.value.add(route)
      return
    }

    const routesList = context.defineAndRegister({
      identifier: Identifier.createVariable('toRoutesList'),
      value: new MockRoutesList({ context }),
      destinationPath: exportPath,
      lang: typescript
    })

    routesList.value.add(route)
  }
})
