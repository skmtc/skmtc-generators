import * as v from 'valibot'
import { toRefName } from '@skmtc/core'
import type { GenerateContextType, RefName } from '@skmtc/core'
import { toCsModelName } from './base.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * The per-variant enrichment value gen-csharp's model bases declare
 * (CD1, the spec-28 port) — the SUBJECT leaf of the three-scope umbrella.
 * Valibot strips the union-hint keys (`discriminator`, `properties`) read
 * separately by `unionHints.ts` — one `main` object carries both concerns.
 */
export const modelSubjectSchema = v.optional(v.object({ name: v.optional(v.string()) }))

export type ModelEnrichment = v.InferOutput<typeof modelSubjectSchema>

/**
 * The three-scope enrichment umbrella (`{ subject, generator, stack }`)
 * the projection chain carries on `ContentSettings.enrichments`. gen-csharp
 * only consumes the subject scope (the per-model rename); `generator` /
 * `stack` are unused (declared `v.undefined()`). `static toEnrichments`
 * parses the raw umbrella through this composite, cast-free.
 */
export const enrichmentSchema = v.object({
  subject: modelSubjectSchema,
  generator: v.undefined(),
  stack: v.undefined()
})

export type EnrichmentSchema = v.InferOutput<typeof enrichmentSchema>

export const toEnrichmentSchema = () => enrichmentSchema

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The consumer-supplied rename for a model (CD1):
 * `enrichments["@skmtc/gen-csharp"][refName].main.name` — turns
 * schema-derived monsters (`ListCreditNoteEndpoint…Model`) into
 * readable identifiers (`CreditNotePage`). The alias names the FILE
 * too (identifier and file stay 1:1). Collisions are caught by the
 * engine's `(name, exportPath)` + generatorKey integrity check.
 */
export const toModelAlias = (
  context: GenerateContextType,
  refName: RefName
): string | undefined => {
  const namespace = context.settings?.enrichments?.[denoJson.name]

  if (!isRecord(namespace)) {
    return undefined
  }

  const perRef = namespace[refName]

  if (!isRecord(perRef) || !isRecord(perRef.main)) {
    return undefined
  }

  return typeof perRef.main.name === 'string' ? perRef.main.name : undefined
}

/**
 * The display name every NAME-ONLY site uses (member `baseTypes`, the
 * parent's `[JsonDerivedType(typeof(<Name>))]` arguments, …): the
 * alias when the consumer declared one, else the derived name. Insert
 * sites get the same answer through the enrichment channel on the
 * projection bases — one rule, two routes.
 */
export const toCsModelDisplayName = (context: GenerateContextType, refName: string): string => {
  return toModelAlias(context, toRefName(refName)) ?? toCsModelName(refName)
}
