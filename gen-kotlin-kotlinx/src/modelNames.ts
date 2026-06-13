import * as v from 'valibot'
import { toRefName } from '@skmtc/core'
import type { GenerateContextType, RefName } from '@skmtc/core'
import { toKtModelName } from './base.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * The per-variant enrichment value gen-kotlin's model bases declare
 * (spec 28). Valibot strips the union-hint keys (`discriminator`,
 * `properties`) read separately by `unionHints.ts` — one `main` object
 * carries both concerns.
 */
export const modelEnrichmentSchema = v.optional(
  v.object({ name: v.optional(v.string()) })
)

export type ModelEnrichment = v.InferOutput<typeof modelEnrichmentSchema>

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The consumer-supplied rename for a model (spec 28):
 * `enrichments["@skmtc/gen-kotlin-kotlinx"][refName].main.name` — turns
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
 * The display name every NAME-ONLY site uses (supertype clauses, …):
 * the alias when the consumer declared one, else the derived name.
 * Insert sites get the same answer through the enrichment channel on
 * the projection bases — one rule, two routes.
 */
export const toKtModelDisplayName = (context: GenerateContextType, refName: string): string => {
  return toModelAlias(context, toRefName(refName)) ?? toKtModelName(refName)
}
