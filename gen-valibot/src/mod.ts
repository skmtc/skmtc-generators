import { toModelEntry, type DeclaredProjection } from '@skmtc/core'
import { typescriptProjections } from '@skmtc/gen-typescript'
import { ValibotProjection } from './ValibotProjection.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Every projection class gen-valibot can insert: its own, and
 * gen-typescript's, for the type of a model in a cycle. A generator that
 * inserts from gen-valibot spreads this list into its entry's `projections`.
 */
export const valibotProjections: readonly DeclaredProjection[] = [
  ValibotProjection,
  ...typescriptProjections
]

export const valibotEntry = toModelEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  projections: valibotProjections,
  transform({ context, ref }) {
    context.insertModel(ValibotProjection, ref)
  }
})