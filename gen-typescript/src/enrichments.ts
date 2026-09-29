import * as v from 'valibot'
import type { Enrichments } from '@skmtc/core'

type GeneratorSettings =
  | {
      /**
       * One file for every type, in place of one file per type. A stack that
       * renders one operation per run sets it so the operation's types land
       * in the same file as the code that uses them.
       */
      exportPath?: string
    }
  | undefined

const generatorSettings: v.GenericSchema<GeneratorSettings> = v.optional(
  v.object({
    exportPath: v.optional(v.string())
  })
)

export type EnrichmentSchema = Enrichments<undefined, GeneratorSettings, undefined>

const enrichmentSchema: v.GenericSchema<EnrichmentSchema> = v.object({
  subject: v.undefined(),
  generator: generatorSettings,
  stack: v.undefined()
})

export const toEnrichmentSchema = (): v.GenericSchema<EnrichmentSchema> => enrichmentSchema
