import invariant from 'tiny-invariant'
import { ExpressApp } from './ExpressApp.ts'
import { toOasOperationEntry } from '@skmtc/core'
import { typescript } from '@skmtc/lang-typescript'
import denoJson from '../deno.json' with { type: 'json' }

export const expressEntry = toOasOperationEntry({
  id: denoJson.name,
  lang: typescript,
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
