import * as v from 'valibot'
import { moduleExport } from '@skmtc/core'

// Per-field override carried by the form's `fields[]` enrichment.
// `id` matches the field's argument/property name; everything else
// is optional. `references` opts the field into the operation-
// reference dispatch protocol — see gen-shadcn-select.
export const formFieldItem = v.object({
  id: v.string(),
  accessorPath: v.optional(v.array(v.string())),
  input: v.optional(moduleExport),
  label: v.optional(v.string()),
  placeholder: v.optional(v.string()),
  references: v.optional(v.string())
})

export type FieldSchema = v.InferOutput<typeof formFieldItem>

export const formSchema = v.optional(
  v.object({
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    submitLabel: v.optional(v.string()),
    fields: v.optional(v.array(formFieldItem))
  })
)

export type EnrichmentSchema = v.InferOutput<typeof formSchema>
export const toEnrichmentSchema = () => formSchema
