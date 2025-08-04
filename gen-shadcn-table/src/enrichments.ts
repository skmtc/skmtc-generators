import * as v from 'valibot'
import { tableColumnItem } from '@skmtc/core'

export const tablePropertiesSchema = v.object({
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  columns: v.array(tableColumnItem)
})

export type ColumnSchema = v.InferOutput<typeof tableColumnItem>

export const tableSchema = v.optional(
  v.object({
    table: tablePropertiesSchema
  })
)

export type EnrichmentSchema = v.InferOutput<typeof tableSchema>

export const toEnrichmentSchema = () => tableSchema
