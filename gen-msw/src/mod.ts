import { toOasOperationEntry } from '@skmtc/core'
import { defineAndRegister, createVariable } from '@skmtc/lang-typescript'
import { MockRoute } from './MockRoute.ts'
import { MockRoutesList } from './MockRoutesList.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const MswEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,

  toEnrichmentSchema,

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

    const routesList = defineAndRegister(context, {
      identifier: createVariable('toRoutesList'),
      value: new MockRoutesList({ context }),
      destinationPath: exportPath
    })

    routesList.value.add(route)
  }
})
