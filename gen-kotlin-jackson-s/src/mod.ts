import { toModelEntry } from '@skmtc/core'
import settings from '@/settings.json' with { type: 'json' }
import { setModelConfig } from '@/modelConfig.ts'
import { JacksonSModel } from '@/JacksonSModel.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * The gen-kotlin-jackson-s model entry — emits Stainless-shape Kotlin model
 * classes (the `@JsonCreator` `JsonField` class with its builder, accessors,
 * validate block, and nested inline classes) from `components.schemas`
 * object entries. Non-object components produce no artifact; nested objects
 * stay inline in the owning class body (the engine owns nesting).
 *
 * INTERIM config: the model identity (basePackage / clientPrefix /
 * artifactName) is read from `src/settings.json`, imported directly and
 * injected via `setModelConfig` at the top of `transform` — the Q6 stopgap,
 * mirroring the SDK's `sdk-config.json`. To be replaced by the core
 * document-global enrichment tier (read off `context.settings`); leaving it
 * deliberately unpolished until then.
 */
export const jacksonSEntry = toModelEntry({
  id: denoJson.name,
  transform({ context, refName }) {
    setModelConfig(settings)

    const schema = context.resolveSchemaRefOnce(refName, denoJson.name)

    if (schema.isRef() || schema.type !== 'object') {
      return
    }

    context.insertModel(JacksonSModel, refName)
  }
})

export default jacksonSEntry
