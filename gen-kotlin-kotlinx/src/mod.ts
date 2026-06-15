import { toModelEntry } from '@skmtc/core'
import { KtModelProjection } from './KtModelProjection.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from './enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * The gen-kotlin-kotlinx model entry. Emits Kotlin DTOs from
 * `components.schemas`: `data class` for objects, `enum class` for string
 * enums, `typealias` for everything else — serialization flavor is
 * `kotlinx.serialization` (`@Serializable` + `@SerialName`).
 *
 * Config (`basePackage`, `scalars`) is read from the `generator` enrichment
 * scope (`client.json#enrichments[id]._generator`), not constructor options:
 * the projection's statics read it off the core-loaded umbrella, and value
 * snippets read it off `context`. So the generator runs CLI-only (a bundled
 * generator can't take options) and carries no module state.
 */
export default toModelEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform({ context, refName }) {
    context.insertModel(KtModelProjection, refName)
  }
})
