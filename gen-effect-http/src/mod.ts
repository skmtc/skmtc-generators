import { toOasOperationEntry, type DeclaredProjection } from '@skmtc/core'
import { effectSchemaProjections } from '@skmtc/gen-effect-schema'
import denoJson from '../deno.json' with { type: 'json' }
import { type EnrichmentSchema, toEnrichmentSchema } from './enrichments.ts'
import { EffectEndpoint } from './EffectEndpoint.ts'

/**
 * Every projection class gen-effect-http can insert: its own, and
 * gen-effect-schema's, for the schemas of an operation. A generator that
 * inserts from gen-effect-http spreads this list into its entry's
 * `projections`.
 */
export const effectHttpProjections: readonly DeclaredProjection[] = [
  EffectEndpoint,
  ...effectSchemaProjections,
]

export const effectHttpEntry = toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  projections: effectHttpProjections,
  transform({ context, operation, variant }) {
    // The projection registers itself and its co-located schemas into the
    // barrel; see EffectEndpoint.
    context.insertOperation({ projection: EffectEndpoint, operation, variant })
  },
  // A project scopes a large document with `include` to the endpoints it
  // calls, so the only capability question is the method.
  isSupported({ operation }) {
    return ['get', 'post', 'put', 'patch', 'delete'].includes(operation.method)
  },
})
