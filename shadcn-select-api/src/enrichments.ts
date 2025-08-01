import { inputItem } from '@skmtc/core'
import * as v from 'valibot'

export const enrichmentSchema = v.optional(
  v.object({
    input: inputItem
  })
)

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>

export const toEnrichmentSchema = () => enrichmentSchema
