import { toOasOperationEntry } from '@skmtc/core'
import { ResponseModelBase } from '@/base.ts'
import { ensureClient } from '@/client/ensureClient.ts'
import { toSdkConfig } from '@/config.ts'
import { emitStaticFiles } from '@/emitStaticFiles.ts'
import { toEnrichmentSchema, type EnrichmentSchema } from '@/enrichments.ts'
import { KtSdkParams } from '@/KtSdkParams.ts'
import { KtSdkResponseModel } from '@/KtSdkResponseModel.ts'
import {
  KtSdkService,
  KtSdkServiceAsync,
  KtSdkServiceAsyncImpl,
  KtSdkServiceImpl
} from '@/services/toServiceProjection.ts'
import denoJson from '../deno.json' with { type: 'json' }

export default toOasOperationEntry<EnrichmentSchema>({
  id: denoJson.name,
  isSupported: () => true,
  toEnrichmentSchema,
  transform({ context, operation, variant }) {
    const config = toSdkConfig(context)

    emitStaticFiles({ context, config })

    const enrichment = ResponseModelBase.toEnrichments({ operation, context, variant })

    // Non-defaultable generator: no subject enrichment → no artifact (the
    // §8 carve-out — isSupported stays a capability claim). `enrichment` is
    // the `{ subject, generator, stack }` umbrella; the per-operation
    // Stainless config is its `subject` leaf.
    if (!enrichment.subject) {
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
      const name = ServiceProjection.toIdentifierName({
        operation,
        enrichments: enrichment,
        variant
      })
      const exportPath = ServiceProjection.toExportPath({
        operation,
        enrichments: enrichment,
        variant
      })

      if (!context.findDefinition({ name, exportPath })) {
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
