import { toModelEntry } from '@skmtc/core'
import { KtDefinition, createClass, register } from '@skmtc/lang-kotlin'
import { toJacksonSModelExportPath, toJacksonSModelName } from '@/base.ts'
import { getModelConfig } from '@/modelConfig.ts'
import { SdkModelValue } from '@/model/SdkModelValue.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from '@/enrichments.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * The gen-kotlin-jackson-s model entry — emits Stainless-shape Kotlin model
 * classes (the `@JsonCreator` `JsonField` class with its builder, accessors,
 * validate block, and nested inline classes) from `components.schemas`
 * object entries. Non-object components produce no artifact; nested objects
 * stay inline in the owning class body (the engine owns nesting).
 *
 * Each model is the {@link SdkModelValue} producer (the shape engine the SDK
 * also builds) wrapped in a `class` Definition — used directly here, no
 * projection layer. The model identity (basePackage / clientPrefix /
 * artifactName + the model-shaping transforms) is read from the shared
 * `_stack` enrichment off `context.settings` (`getModelConfig`), so the entry
 * needs no per-ref injection and no baked-in JSON.
 */
export const jacksonSEntry = toModelEntry<EnrichmentSchema>({
  id: denoJson.name,
  toEnrichmentSchema,
  transform({ context, refName }) {
    const schema = context.resolveSchemaRefOnce(refName, denoJson.name)

    if (schema.isRef() || schema.type !== 'object') {
      return
    }

    const config = getModelConfig(context)
    const className = toJacksonSModelName(refName)
    const destinationPath = toJacksonSModelExportPath(className, config.basePackage)

    if (context.findDefinition({ name: className, exportPath: destinationPath })) {
      return
    }

    const value = new SdkModelValue({
      context,
      schema,
      className,
      destinationPath,
      fileHeader: config.fileHeader,
      sharedHashes: new Map(),
      sorted: true
    })

    register(context, {
      definitions: [new KtDefinition({ context, identifier: createClass(className), value })],
      destinationPath
    })
  }
})

export default jacksonSEntry
