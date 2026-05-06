import * as v from 'valibot'

export const formPropertiesSchema = v.optional(
  v.object({
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    submitLabel: v.optional(v.string())
  })
)

export const formSchema = v.optional(
  v.object({
    form: formPropertiesSchema
  })
)

export type EnrichmentSchema = v.InferOutput<typeof formSchema>
export const toEnrichmentSchema = () => formSchema
