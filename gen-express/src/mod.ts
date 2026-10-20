import invariant from 'tiny-invariant'
import { ExpressApp } from './ExpressApp.ts'
import { toOasOperationEntry, type Method } from '@skmtc/core'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/** The methods Express has an `app.<method>` route method for. */
const expressMethods: readonly Method[] = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']

export const expressEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  isSupported({ operation }) {
    return expressMethods.includes(operation.method)
  },
  transform: ({ context, operation, variant }) => {
    const enrichments = ExpressApp.toEnrichments({ operation, context, variant })
    const app =
      context.findDefinition({
        name: 'app',
        exportPath: ExpressApp.toExportPath({ operation, enrichments, variant })
      }) ?? context.insertOperation({ projection: ExpressApp, operation, variant }).definition

    invariant(app?.value instanceof ExpressApp, 'app must be an instance of ExpressApp')

    app.value.append(operation)
  }
})
