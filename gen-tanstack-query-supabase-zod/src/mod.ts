import { TanstackQuery } from './TanstackQuery.ts'
import { toOasOperationEntry } from '@skmtc/core'
import denoJson from '../deno.json' with { type: 'json' }

export const tanstackQueryEntry = toOasOperationEntry({
  id: denoJson.name,
  transform: ({ context, operation }) => {
    context.insertOperation({ insertable: TanstackQuery, operation: operation })
  },
  isSupported({ operation }) {
    if (['get', 'delete'].includes(operation.method)) {
      return true
    }

    if (['post', 'put', 'patch'].includes(operation.method)) {
      return Boolean(operation.toRequestBody(({ schema }) => schema))
    }

    return false
  }
})
