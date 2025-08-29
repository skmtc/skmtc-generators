import { TanstackQuery } from './TanstackQuery.ts'
import { toOperationEntry } from '@skmtc/core'
import denoJson from '../deno.json' with { type: 'json' }

export const tanstackQueryEntry = toOperationEntry({
  id: denoJson.name,
  transform: ({ context, operation }) => {
    context.insertOperation(TanstackQuery, operation)
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
