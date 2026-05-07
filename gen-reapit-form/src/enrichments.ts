import { formItem, type FormItem, type FormFieldItem } from '@skmtc/core'
import * as v from 'valibot'

// Use the canonical `formItem` shape from core. Per-field overrides
// (including `references` for lookup dispatch) live in `form.fields[]`
// keyed by `id` matching the top-level argument name. The CLI parses
// client.json through the canonical schema, so anything outside this
// shape gets silently stripped.
export const formSchema = v.optional(
  v.object({
    form: v.optional(formItem)
  })
)

export type EnrichmentSchema = v.InferOutput<typeof formSchema>
export type { FormItem, FormFieldItem }
export const toEnrichmentSchema = () => formSchema
