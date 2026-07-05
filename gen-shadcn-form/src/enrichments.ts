import * as v from 'valibot'
import { lensInputModuleType, moduleSelect } from '@skmtc/core'

// Per-field override carried by the form's `fields[]` enrichment.
// `moduleSelect` is the field binding, one unit: `schemaPath` identifies the
// request-body property the entry maps to (the join key — no separate `id`),
// and the optional `module` points the field at a consumer component bound to
// the field's lens; the declared module type (`lensInputModuleType`) is what
// the editor's matcher verifies candidates against. `references` opts the
// field into the operation-reference protocol — see gen-shadcn-select.
export const formFieldItem = v.object({
  moduleSelect: v.pipe(moduleSelect(lensInputModuleType), v.title('Input')),
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

// A schemaPath may lead with a target token (the editor writes target-first
// paths); the property segments follow it.
const PATH_TARGETS = ['RequestBody', 'SuccessResponse', 'Model']
export const toProperties = (schemaPath: string[]): string[] =>
  schemaPath.length > 0 && PATH_TARGETS.includes(schemaPath[0])
    ? schemaPath.slice(1)
    : schemaPath

