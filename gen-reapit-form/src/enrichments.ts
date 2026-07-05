import { lensInputModuleType, moduleSelect } from '@skmtc/core'
import * as v from 'valibot'

// Per-field override carried by the form's `fields[]` enrichment.
// `moduleSelect` is the field binding, one unit: its `schemaPath` identifies
// which field the override applies to (property segments; nested fields are
// deeper paths like ['primaryAddress', 'type']) and the optional `module`
// points the field at a consumer component. Everything else is optional so
// callers carry only the data they want to set.
export const formFieldItem = v.object({
  moduleSelect: v.pipe(moduleSelect(lensInputModuleType), v.title('Input')),
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

// A schemaPath may lead with a target token (the editor writes target-first
// paths); the property segments follow it.
const PATH_TARGETS = ['RequestBody', 'SuccessResponse', 'Model']
export const toProperties = (schemaPath: string[]): string[] =>
  schemaPath.length > 0 && PATH_TARGETS.includes(schemaPath[0])
    ? schemaPath.slice(1)
    : schemaPath
