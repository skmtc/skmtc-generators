import * as v from 'valibot'
import { moduleExport } from '@skmtc/core'

// Per-input override for the standalone select component.
// `formatter` references a consumer-side option renderer.
export const inputItem = v.object({
  id: v.string(),
  accessorPath: v.array(v.string()),
  formatter: moduleExport
})

export type InputItem = v.InferOutput<typeof inputItem>

// The subject-scoped leaf — the per-operation select override.
export const inputSchema = v.optional(
  v.object({
    input: inputItem
  })
)

// The three-scope enrichment umbrella. This generator only consumes the
// subject scope; `generator` / `stack` are unused (declared `v.undefined()`).
export const enrichmentSchema = v.object({
  subject: inputSchema,
  generator: v.undefined(),
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>

export const toEnrichmentSchema = () => enrichmentSchema
