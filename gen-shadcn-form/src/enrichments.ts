import * as v from 'valibot'
import { formFieldItem } from '@skmtc/core'

export const formPropertiesSchema = v.optional(
  v.object({
    title: v.optional(v.string()),
    fields: v.optional(v.array(formFieldItem))
  })
)

export type FieldSchema = v.InferOutput<typeof formFieldItem>

export const formSchema = v.optional(
  v.object({
    form: formPropertiesSchema
  })
)

export type EnrichmentSchema = v.InferOutput<typeof formSchema>
export const toEnrichmentSchema = () => formSchema
