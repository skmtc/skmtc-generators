import * as v from 'valibot'
import { modelConfigSchema } from '@/modelConfig.ts'

// gen-kotlin-jackson-s reads no per-subject or per-generator enrichments.
// Its model identity (basePackage / clientPrefix / artifactName + the
// model-shaping transforms) is the SHARED model config, read from the
// `_stack` scope so the engine reaches it id-agnostically — whether it runs
// standalone or embedded in gen-kotlin-sdk by import-and-construct.
export const enrichmentSchema = v.object({
  subject: v.undefined(),
  generator: v.undefined(),
  stack: modelConfigSchema
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>

export const toEnrichmentSchema = () => enrichmentSchema
