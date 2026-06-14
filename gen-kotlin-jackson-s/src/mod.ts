import { toModelEntry } from '@skmtc/core'
import { JacksonSModel } from '@/JacksonSModel.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from '@/enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * The gen-kotlin-jackson-s model entry — emits Stainless-shape Kotlin model
 * classes (the `@JsonCreator` `JsonField` class with its builder, accessors,
 * validate block, and nested inline classes) from `components.schemas`
 * object entries. Non-object components produce no artifact; nested objects
 * stay inline in the owning class body (the engine owns nesting).
 *
 * The model identity (basePackage / clientPrefix / artifactName) comes from
 * `src/settings.json` — the shared engine reads it as the default config, so
 * the entry needs no per-ref injection. INTERIM, to be replaced by the core
 * document-global config tier (read off `context.settings`).
 *
 * TODO: gate object-only via the projection's `isSupported` capability claim
 * rather than the inline transform filter (deferred — model `isSupported`
 * mechanics need settling first).
 */
export const jacksonSEntry = toModelEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform({ context, refName }) {
    const schema = context.resolveSchemaRefOnce(refName, denoJson.name)

    if (schema.isRef() || schema.type !== 'object') {
      return
    }

    context.insertModel(JacksonSModel, refName)
  }
})

export default jacksonSEntry
