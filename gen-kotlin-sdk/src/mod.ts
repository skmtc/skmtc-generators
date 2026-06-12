import { camelCase, capitalize, toOasOperationEntry } from '@skmtc/core'
import type {
  GenerateContextType,
  OasOperation,
  OasOperationProjectionConstructorArgs
} from '@skmtc/core'
import * as v from 'valibot'
import { createClass, toOasOperationProjectionBase } from '@skmtc/lang-kotlin'
import invariant from 'tiny-invariant'
import { emitStaticFiles } from './emitStaticFiles.ts'
import { ensureSharedModels } from './sharedModels.ts'
import { generatedFileHeader } from './generatedFileHeader.ts'
import { injectDataFields, toSdkModel } from './model/toSdkModel.ts'
import { SdkModelValue } from './model/SdkModelValue.ts'
import { sdkOperationEnrichmentSchema, toEnrichmentSchema } from './enrichments.ts'
import type { SdkOperationEnrichment } from './enrichments.ts'
import type { SdkConfig } from './SdkConfig.ts'
import denoJson from '../deno.json' with { type: 'json' }

/**
 * Factory for the gen-kotlin-sdk operation entry — a Stainless-shape
 * Kotlin SDK generator (arc note 32). KS-B: the spec-independent
 * static surface; KS-C: per-operation Response model classes + the
 * config-asserted shared models. `config` is the SDK-global identity
 * (the document-global half of a Stainless config); it rides this
 * closure — never module scope. The default module export feeds it
 * `src/sdk-config.json` (the Q6 interim mechanism).
 */
export const toKotlinSdkEntry = (config: SdkConfig) => {
  const packageDirs = config.basePackage.split('.').join('/')
  const coreModuleRoot = `${config.artifactName}-core/src/main/kotlin/${packageDirs}`

  const toClassStem = (enrichment: NonNullable<SdkOperationEnrichment>): string => {
    const resourceTail = enrichment.resource[enrichment.resource.length - 1]

    invariant(resourceTail, '@skmtc/gen-kotlin-sdk: enrichment resource path is empty')

    return enrichment.classStem ?? capitalize(camelCase(resourceTail))
  }

  const ResponseModelBase = toOasOperationProjectionBase<SdkOperationEnrichment>({
    id: denoJson.name,
    toEnrichmentSchema,
    toIdentifier({ operation, enrichments, variant }) {
      // Statics may be probed for unenriched operations (which the
      // transform never inserts); give them a deterministic name.
      // Variants-unaware: `variant` is destructured but unused.
      void variant

      if (!enrichments) {
        return createClass(`Unenriched${capitalize(camelCase(operation.path))}Response`)
      }

      return createClass(
        `${toClassStem(enrichments)}${capitalize(camelCase(enrichments.method))}Response`
      )
    },
    toExportPath({ operation, enrichments, variant }) {
      const { name } = this.toIdentifier({ operation, enrichments, variant })

      const resourceDir = enrichments
        ? enrichments.resource.join('').toLowerCase()
        : 'unenriched'

      return `${coreModuleRoot}/models/${resourceDir}/${name}.kt`
    }
  })

  class KtSdkResponseModel extends ResponseModelBase {
    /**
     * TEMP until the core dotted-path enrichment fix ships (core
     * >0.9.1, note 32: lodash string paths split on `.`, so operation
     * paths ending in `.json` never resolved). Same routing, literal
     * keys.
     */
    static override toEnrichments = ({
      operation,
      context,
      variant
    }: {
      operation: OasOperation
      context: GenerateContextType
      variant: string
    }): SdkOperationEnrichment => {
      const routed = v.parse(
        v.optional(v.record(v.string(), v.record(v.string(), v.record(v.string(), v.unknown())))),
        context.settings?.enrichments?.[denoJson.name]
      )

      return v.parse(
        sdkOperationEnrichmentSchema,
        routed?.[operation.path]?.[operation.method]?.[variant]
      )
    }

    value: SdkModelValue

    constructor(args: OasOperationProjectionConstructorArgs<SdkOperationEnrichment>) {
      super(args)

      const { context, operation, settings } = args

      const { sharedHashes, renderContext } = ensureSharedModels({ context, config })

      const schema = operation.toSuccessResponse()?.resolve().toSchema()?.resolve()

      invariant(
        schema && schema.type === 'object',
        `@skmtc/gen-kotlin-sdk: ${operation.method} ${operation.path} has no object response schema`
      )

      const walked = toSdkModel({
        schema,
        className: settings.identifier.name,
        sharedHashes,
        envelopeFields: config.sharedModels.envelope.fields,
        fieldStates: config.fieldStates,
        fieldEnums: config.fieldEnums
      })

      const addFields = settings.enrichments?.addFields

      const model = addFields?.length
        ? injectDataFields({ model: walked, addFields, fieldStates: config.fieldStates })
        : walked

      this.value = new SdkModelValue({
        context,
        model,
        renderContext,
        basePackage: config.basePackage,
        destinationPath: settings.exportPath,
        fileHeader: generatedFileHeader
      })
    }

    // The Driver wraps the PROJECTION, so the value protocols are
    // mirrored here (the spec-28 gotcha).
    get constructorModifiers(): string {
      return this.value.constructorModifiers
    }

    get constructorParameters(): string {
      return this.value.constructorParameters
    }

    override toString(): string {
      return this.value.toString()
    }
  }

  return toOasOperationEntry<SdkOperationEnrichment>({
    id: denoJson.name,
    isSupported: () => true,
    toEnrichmentSchema,
    transform({ context, operation, variant }) {
      emitStaticFiles({ context, config })

      const enrichment = KtSdkResponseModel.toEnrichments({ operation, context, variant })

      // Non-defaultable generator: no enrichment → no artifact (the
      // §8 carve-out — isSupported stays a capability claim).
      if (!enrichment) {
        return
      }

      const schema = operation.toSuccessResponse()?.resolve().toSchema()?.resolve()

      // Operations without a JSON object response produce no Response
      // model; neither do ENVELOPE-ONLY responses (the report-problem
      // pair: the schema is exactly the ResponseWrapper, no payload).
      if (!schema || schema.type !== 'object') {
        return
      }

      const envelopeFields = new Set(config.sharedModels.envelope.fields)
      const propertyNames = Object.keys(schema.properties ?? {})

      if (propertyNames.every(name => envelopeFields.has(name))) {
        return
      }

      context.insertOperation({ projection: KtSdkResponseModel, operation })
    }
  })
}

export type { SdkConfig, SdkAuthConfig } from './SdkConfig.ts'
export { sdkOperationEnrichmentSchema }
