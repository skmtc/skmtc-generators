import * as v from 'valibot'
import type { Enrichments } from '@skmtc/core'

type FetchSettings = { baseUrl?: string } | undefined

const fetchSettings: v.GenericSchema<FetchSettings> = v.optional(
  v.object({
    baseUrl: v.optional(v.string())
  })
)

export type EnrichmentSchema = Enrichments<FetchSettings, FetchSettings>

export const enrichmentSchema: v.GenericSchema<EnrichmentSchema> = v.object({
  subject: fetchSettings,
  generator: fetchSettings,
  stack: v.undefined()
})

export const toEnrichmentSchema = (): v.GenericSchema<EnrichmentSchema> => enrichmentSchema
