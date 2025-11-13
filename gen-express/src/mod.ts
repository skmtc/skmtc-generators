import invariant from 'tiny-invariant'
import { ExpressApp } from './ExpressApp.ts'
import { toOperationEntry } from '@skmtc/core'
import denoJson from '../deno.json' with { type: 'json' }

export const expressEntry = toOperationEntry({
  id: denoJson.name,
  transform: ({ context, operation }) => {
    const app =
      context.findDefinition({
        name: 'app',
        exportPath: ExpressApp.toExportPath(operation)
      }) ?? context.insertOperation(ExpressApp, operation).definition

    invariant(app?.value instanceof ExpressApp, 'app must be an instance of ExpressApp')

    app.value.append(operation)
  }
})
