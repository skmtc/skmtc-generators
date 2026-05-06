import * as v from 'valibot'
import { formFieldItem } from '@skmtc/core'

// Only fields covered by the canonical core/types/Enrichments.ts `formItem`
// schema survive the central client.json validation. DaisyUI-specific
// options (size, submitColor, layout, showCard) are read from the
// `x-daisy-form` operation extension instead — see DaisyForm.ts.
export const formPropertiesSchema = v.optional(
  v.object({
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    submitLabel: v.optional(v.string()),
    fields: v.optional(v.array(formFieldItem))
  })
)

export const formSchema = v.optional(
  v.object({
    form: formPropertiesSchema
  })
)

export type EnrichmentSchema = v.InferOutput<typeof formSchema>
export const toEnrichmentSchema = () => formSchema
