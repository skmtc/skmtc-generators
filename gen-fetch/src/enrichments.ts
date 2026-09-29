import * as v from 'valibot'
import type { Enrichments } from '@skmtc/core'

type GeneratorSettings =
  | {
      /**
       * One file for every operation, in place of one file per operation. Set
       * it to the same path as gen-zod's and gen-typescript's `exportPath` to
       * get self-contained files.
       */
      exportPath?: string
      /**
       * The default base URL. Wins over the document's `servers`, so a caller
       * that has resolved a relative server URL can pass the absolute one.
       */
      baseUrl?: string
      /** A link to the operation's documentation, written into its JSDoc. */
      docsUrl?: string
    }
  | undefined

const generatorSettings: v.GenericSchema<GeneratorSettings> = v.optional(
  v.object({
    exportPath: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    docsUrl: v.optional(v.string())
  })
)

export type EnrichmentSchema = Enrichments<undefined, GeneratorSettings, undefined>

const enrichmentSchema: v.GenericSchema<EnrichmentSchema> = v.object({
  subject: v.undefined(),
  generator: generatorSettings,
  stack: v.undefined()
})

export const toEnrichmentSchema = (): v.GenericSchema<EnrichmentSchema> => enrichmentSchema
