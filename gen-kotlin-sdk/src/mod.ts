import { camelCase, capitalize, toOasOperationEntry } from '@skmtc/core'
import type {
  GenerateContextType,
  OasOperation,
  OasOperationProjectionConstructorArgs
} from '@skmtc/core'
import * as v from 'valibot'
import { createClass, toOasOperationProjectionBase } from '@skmtc/lang-kotlin'
import invariant from 'tiny-invariant'
import { emitStaticFiles, type StaticFilesOverlay } from './emitStaticFiles.ts'
import { ensureSharedModels } from './sharedModels.ts'
import { generatedFileHeader } from './generatedFileHeader.ts'
import { injectDataFields, toSdkModel } from './model/toSdkModel.ts'
import { SdkModelValue } from './model/SdkModelValue.ts'
import { toSdkParams } from './params/SdkParams.ts'
import { SdkParamsValue } from './params/SdkParamsValue.ts'
import { toSdkService } from './services/SdkService.ts'
import { SdkServiceImplValue, SdkServiceValue } from './services/SdkServiceValue.ts'
import { SdkClientImplValue, SdkClientValue } from './client/SdkClientValue.ts'
import type { SdkClientModel } from './client/SdkClient.ts'
import { createInterface, defineAndRegister, register } from '@skmtc/lang-kotlin'
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
export type KotlinSdkEntryExtras = {
  /** Corpus-harness template overlay (§KS-F F2); product consumers omit it. */
  staticOverlay?: StaticFilesOverlay
}

export const toKotlinSdkEntry = (config: SdkConfig, extras: KotlinSdkEntryExtras = {}) => {
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
        envelopeFields: config.sharedModels.envelope?.fields,
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

  const ParamsBase = toOasOperationProjectionBase<SdkOperationEnrichment>({
    id: denoJson.name,
    toEnrichmentSchema,
    toIdentifier({ operation, enrichments, variant }) {
      void variant

      if (!enrichments) {
        return createClass(`Unenriched${capitalize(camelCase(operation.path))}Params`)
      }

      return createClass(
        `${toClassStem(enrichments)}${capitalize(camelCase(enrichments.method))}Params`
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

  class KtSdkParams extends ParamsBase {
    static override toEnrichments = KtSdkResponseModel.toEnrichments

    value: SdkParamsValue

    constructor(args: OasOperationProjectionConstructorArgs<SdkOperationEnrichment>) {
      super(args)

      const { context, operation, settings } = args

      const { renderContext } = ensureSharedModels({ context, config })

      this.value = new SdkParamsValue({
        context,
        model: toSdkParams({
          operation,
          className: settings.identifier.name,
          fieldEnums: config.fieldEnums
        }),
        renderContext,
        basePackage: config.basePackage,
        destinationPath: settings.exportPath,
        fileHeader: generatedFileHeader
      })
    }

    get description(): string {
      return this.value.description
    }

    get constructorModifiers(): string {
      return this.value.constructorModifiers
    }

    get constructorParameters(): string {
      return this.value.constructorParameters
    }

    get supertypes(): string[] {
      return this.value.supertypes
    }

    override toString(): string {
      return this.value.toString()
    }
  }

  type ServiceFlavor = 'blocking' | 'async'
  type ServiceRole = 'interface' | 'impl'

  const resolveEnrichment = (context: GenerateContextType) => (operation: OasOperation) =>
    KtSdkResponseModel.toEnrichments({ operation, context, variant: 'main' })

  const toServiceProjection = (flavor: ServiceFlavor, role: ServiceRole) => {
    const nameSuffix = `Service${flavor === 'async' ? 'Async' : ''}${role === 'impl' ? 'Impl' : ''}`
    const directory = flavor === 'async' ? 'async' : 'blocking'

    const Base = toOasOperationProjectionBase<SdkOperationEnrichment>({
      id: denoJson.name,
      toEnrichmentSchema,
      toIdentifier({ operation, enrichments, variant }) {
        void variant

        if (!enrichments) {
          return createClass(`Unenriched${capitalize(camelCase(operation.path))}${nameSuffix}`)
        }

        const name = `${toClassStem(enrichments)}${nameSuffix}`

        return role === 'interface' ? createInterface(name) : createClass(name)
      },
      toExportPath({ operation, enrichments, variant }) {
        const { name } = this.toIdentifier({ operation, enrichments, variant })

        return `${coreModuleRoot}/services/${directory}/${name}.kt`
      }
    })

    return class extends Base {
      static override toEnrichments = KtSdkResponseModel.toEnrichments

      value: SdkServiceValue | SdkServiceImplValue

      constructor(args: OasOperationProjectionConstructorArgs<SdkOperationEnrichment>) {
        super(args)

        const { context, operation, settings } = args
        const enrichment = resolveEnrichment(context)(operation)

        invariant(enrichment, '@skmtc/gen-kotlin-sdk: service projection requires an enrichment')

        const service = toSdkService({
          context,
          config,
          stem: toClassStem(enrichment),
          resource: enrichment.resource,
          resolveEnrichment: resolveEnrichment(context)
        })

        const ValueClass = role === 'interface' ? SdkServiceValue : SdkServiceImplValue

        this.value = new ValueClass({
          context,
          service,
          flavor,
          basePackage: config.basePackage,
          destinationPath: settings.exportPath,
          fileHeader: generatedFileHeader
        })
      }

      get constructorModifiers(): string | undefined {
        return this.value instanceof SdkServiceImplValue
          ? this.value.constructorModifiers
          : undefined
      }

      get constructorParameters(): string | undefined {
        return this.value instanceof SdkServiceImplValue
          ? this.value.constructorParameters
          : undefined
      }

      get supertypes(): string[] {
        return this.value instanceof SdkServiceImplValue ? this.value.supertypes : []
      }

      override toString(): string {
        return this.value.toString()
      }
    }
  }

  const KtSdkService = toServiceProjection('blocking', 'interface')
  const KtSdkServiceImpl = toServiceProjection('blocking', 'impl')
  const KtSdkServiceAsync = toServiceProjection('async', 'interface')
  const KtSdkServiceAsyncImpl = toServiceProjection('async', 'impl')

  const ensureClient = (context: GenerateContextType): void => {
    const clientName = `${config.clientPrefix}Client`
    const clientPath = `${coreModuleRoot}/client/${clientName}.kt`

    if (context.findDefinition({ name: clientName, exportPath: clientPath })) {
      return
    }

    invariant(context.document.type === 'oas', '@skmtc/gen-kotlin-sdk: OAS documents only')

    // Resource list in CONFIG ORDER — the enrichment file's key
    // declaration order (§E-5).
    const resolve = resolveEnrichment(context)
    const seen = new Set<string>()
    const resources: SdkClientModel['resources'] = []

    for (const operation of orderedOperations(context)) {
      const enrichment = resolve(operation)

      if (!enrichment) {
        continue
      }

      const accessorName = enrichment.resource[enrichment.resource.length - 1]

      invariant(accessorName, '@skmtc/gen-kotlin-sdk: enrichment resource path is empty')

      if (seen.has(accessorName)) {
        continue
      }

      seen.add(accessorName)
      resources.push({ accessorName, stem: toClassStem(enrichment) })
    }

    const model: SdkClientModel = {
      prefix: config.clientPrefix,
      displayName: config.displayName,
      resources
    }

    const flavors = [
      { flavor: 'blocking', name: clientName },
      { flavor: 'async', name: `${clientName}Async` }
    ] as const

    for (const { flavor, name } of flavors) {
      const interfacePath = `${coreModuleRoot}/client/${name}.kt`
      const implPath = `${coreModuleRoot}/client/${name}Impl.kt`

      const interfaceValue = new SdkClientValue({
        context,
        model,
        flavor,
        basePackage: config.basePackage,
        destinationPath: interfacePath,
        fileHeader: generatedFileHeader
      })

      defineAndRegister(context, {
        identifier: createInterface(name),
        value: interfaceValue,
        destinationPath: interfacePath
      })

      const implValue = new SdkClientImplValue({
        context,
        model,
        flavor,
        basePackage: config.basePackage,
        destinationPath: implPath,
        fileHeader: generatedFileHeader
      })

      defineAndRegister(context, {
        identifier: createClass(`${name}Impl`),
        value: implValue,
        destinationPath: implPath
      })
    }
  }

  /**
   * Document operations in the enrichment file's declaration order —
   * the honest mirror of Stainless's config resource order.
   */
  const orderedOperations = (context: GenerateContextType): OasOperation[] => {
    invariant(context.document.type === 'oas', '@skmtc/gen-kotlin-sdk: OAS documents only')

    const operations = context.document.value.operations
    const enrichmentBlock = context.settings?.enrichments?.[denoJson.name]

    if (!enrichmentBlock || typeof enrichmentBlock !== 'object') {
      return [...operations]
    }

    const pathOrder = new Map(Object.keys(enrichmentBlock).map((path, index) => [path, index]))

    return [...operations].sort(
      (a, b) =>
        (pathOrder.get(a.path) ?? pathOrder.size) - (pathOrder.get(b.path) ?? pathOrder.size)
    )
  }

  return toOasOperationEntry<SdkOperationEnrichment>({
    id: denoJson.name,
    isSupported: () => true,
    toEnrichmentSchema,
    transform({ context, operation, variant }) {
      emitStaticFiles({ context, config, overlay: extras.staticOverlay })

      const enrichment = KtSdkResponseModel.toEnrichments({ operation, context, variant })

      // Non-defaultable generator: no enrichment → no artifact (the
      // §8 carve-out — isSupported stays a capability claim).
      if (!enrichment) {
        return
      }

      // Every enriched operation gets a Params class (even those
      // without a Response model — the report-problem pair) and its
      // resource's four service files + the client singletons.
      context.insertOperation({ projection: KtSdkParams, operation })

      // Service files are per-RESOURCE: a two-op resource builds whole
      // on its first operation's insert (the §E-6 rescan); the second
      // operation must NOT insert — its different GeneratorKey would
      // trip the Driver's identity check on the shared Definition.
      for (const ServiceProjection of [
        KtSdkService,
        KtSdkServiceImpl,
        KtSdkServiceAsync,
        KtSdkServiceAsyncImpl
      ]) {
        const identifier = ServiceProjection.toIdentifier({
          operation,
          enrichments: enrichment,
          variant
        })
        const exportPath = ServiceProjection.toExportPath({
          operation,
          enrichments: enrichment,
          variant
        })

        if (!context.findDefinition({ name: identifier.name, exportPath })) {
          context.insertOperation({ projection: ServiceProjection, operation })
        }
      }

      ensureClient(context)

      const schema = operation.toSuccessResponse()?.resolve().toSchema()?.resolve()

      // Operations without a JSON object response produce no Response
      // model; neither do ENVELOPE-ONLY responses (the report-problem
      // pair: the schema is exactly the ResponseWrapper, no payload).
      if (!schema || schema.type !== 'object') {
        return
      }

      if (config.sharedModels.envelope) {
        const envelopeFields = new Set(config.sharedModels.envelope.fields)
        const propertyNames = Object.keys(schema.properties ?? {})

        if (propertyNames.every(name => envelopeFields.has(name))) {
          return
        }
      }

      context.insertOperation({ projection: KtSdkResponseModel, operation })
    }
  })
}

export type { SdkConfig, SdkAuthConfig } from './SdkConfig.ts'
export { sdkOperationEnrichmentSchema }
