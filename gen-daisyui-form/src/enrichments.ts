import * as v from 'valibot'
import { moduleExport } from '@skmtc/core'

// Per-field override. DaisyUI-specific options (size, submitColor,
// layout, showCard) live on the `x-daisy-form` operation extension
// instead, since those are *operation-level* concerns rather than
// per-field.
export const formFieldItem = v.object({
  id: v.string(),
  accessorPath: v.optional(v.array(v.string())),
  input: v.optional(moduleExport),
  label: v.optional(v.string()),
  placeholder: v.optional(v.string())
})

export type FormFieldItem = v.InferOutput<typeof formFieldItem>

export const formPropertiesSchema = v.optional(
  v.object({
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    submitLabel: v.optional(v.string()),
    fields: v.optional(v.array(formFieldItem))
  })
)

export type FormItem = v.InferOutput<typeof formPropertiesSchema>

export const formSchema = v.optional(
  v.object({
    form: formPropertiesSchema
  })
)

export type EnrichmentSchema = v.InferOutput<typeof formSchema>
export const toEnrichmentSchema = () => formSchema
