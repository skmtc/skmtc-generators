import { Identifier, toOperationEntry } from '@skmtc/core'
import { MockRoute } from './MockRoute.ts'
import { MockRoutesList } from './MockRoutesList.ts'

export const MswEntry = toOperationEntry({
  id: '@skmtc/msw',

  transform: ({ context, operation }) => {
    const insertedRoute = context.insertOperation(MockRoute, operation)

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
      destinationPath: exportPath
    })

    routesList.value.add(route)
  }
})
