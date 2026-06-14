import { moduleExport } from '@skmtc/core'
import * as v from 'valibot'

// Per-field override carried by the form's `fields[]` enrichment.
// `id` is the dotted accessor path identifying which field this
// override applies to (e.g. `"primaryAddress.type"` for nested
// fields); every other property is optional so callers carry only
// the data they want to set.
export const formFieldItem = v.object({
  id: v.string(),
  accessorPath: v.optional(v.array(v.string())),
  input: v.optional(moduleExport),
  label: v.optional(v.string()),
  placeholder: v.optional(v.string()),
  // GraphQL Query field name backing this argument. When set, the
  // form dispatches a producer generator's component via
  // `context.insertOperation` (operation-reference protocol).
  references: v.optional(v.string()),
  // Picks which producer generator handles a referenced field —
  // free-form so new producers can be added without coordinating a
  // schema change here. `gen-reapit-form` knows about
  // `'searchable'` (gen-reapit-searchable-dropdown) and
  // `'multiselect'` (gen-reapit-multi-select).
  referenceKind: v.optional(v.string())
})

export type FormFieldItem = v.InferOutput<typeof formFieldItem>

// Form-level enrichments. Consumed by `ReapitForm` at the leaf of
// the enrichment hierarchy.
export const formItem = v.object({
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  fields: v.optional(v.array(formFieldItem)),
  submitLabel: v.optional(v.string())
})

export type FormItem = v.InferOutput<typeof formItem>

// The subject-scoped leaf — wraps `formItem` under a `form` key so
// other concerns (table, input, …) could be added later in this same
// generator if needed.
const formSchema = v.optional(
  v.object({
    form: v.optional(formItem)
  })
)

// The three-scope enrichment umbrella. This generator only consumes the
// subject scope; `generator` / `stack` are unused (declared `v.undefined()`).
const enrichmentSchema = v.object({
  subject: formSchema,
  generator: v.undefined(),
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>

export const toEnrichmentSchema = () => enrichmentSchema
