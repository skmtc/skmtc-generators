import { toOasOperationEntry, type OasOperationEntry } from '@skmtc/core'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import { FetchFn } from './FetchFn.ts'
import { PostFn } from './PostFn.ts'
import denoJson from '../deno.json' with { type: 'json' }

export const fetchEntry: OasOperationEntry<EnrichmentSchema> = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform: ({ context, operation }) => {
    const projection = operation.method === 'post' ? PostFn : FetchFn
    context.insertOperation({ projection, operation })
  },
  isSupported({ operation }) {
    return ['get', 'post'].includes(operation.method) && !operation.path.includes('{')
  }
})
