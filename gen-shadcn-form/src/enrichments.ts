import * as v from 'valibot'
import { moduleExport } from '@skmtc/core'

// Per-field override carried by the form's `fields[]` enrichment.
// `id` matches the field's argument/property name; everything else
// is optional. `references` opts the field into the operation-
// reference protocol — see gen-shadcn-select.
export const formFieldItem = v.object({
  id: v.string(),
  accessorPath: v.optional(v.array(v.string())),
  input: v.optional(moduleExport),
  label: v.optional(v.string()),
  placeholder: v.optional(v.string()),
  references: v.optional(v.string())
})

export type FieldSchema = v.InferOutput<typeof formFieldItem>

// The subject-scoped leaf — the per-operation form override.
export const formSchema = v.optional(
  v.object({
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    submitLabel: v.optional(v.string()),
    fields: v.optional(v.array(formFieldItem))
  })
)

// The three-scope enrichment umbrella. This generator only consumes the
// subject scope; `generator` / `stack` are unused (declared `v.undefined()`).
export const enrichmentSchema = v.object({
  subject: formSchema,
  generator: v.undefined(),
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>
export const toEnrichmentSchema = () => enrichmentSchema
