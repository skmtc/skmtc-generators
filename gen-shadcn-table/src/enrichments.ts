import * as v from 'valibot'
import { moduleExport } from '@skmtc/core'

// Per-column override. `formatter` references a consumer-side cell
// renderer module; the generator emits the column wired to it.
export const tableColumnItem = v.object({
  id: v.string(),
  accessorPath: v.array(v.string()),
  formatter: moduleExport,
  label: v.string()
})

export type ColumnSchema = v.InferOutput<typeof tableColumnItem>

export const tablePropertiesSchema = v.optional(
  v.object({
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    columns: v.optional(v.array(tableColumnItem))
  })
)

// The subject-scoped leaf — the per-operation table override.
export const tableSchema = v.optional(
  v.object({
    table: tablePropertiesSchema
  })
)

// The three-scope enrichment umbrella. This generator only consumes the
// subject scope; `generator` / `stack` are unused (declared `v.undefined()`).
export const enrichmentSchema = v.object({
  subject: tableSchema,
  generator: v.undefined(),
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>

export const toEnrichmentSchema = () => enrichmentSchema
