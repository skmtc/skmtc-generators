import type { OasOperationProjectionConstructorArgs, Stringable } from '@skmtc/core'
import invariant from 'tiny-invariant'
import {
  resolveEnrichment,
  toClassStem,
  toServiceBase,
  type ServiceFlavor,
  type ServiceRole
} from '@/base.ts'
import { sdkConfig as config } from '@/config.ts'
import type { SdkOperationEnrichment } from '@/enrichments.ts'
import { generatedFileHeader } from '@/generatedFileHeader.ts'
import { toSdkService } from '@/services/SdkService.ts'
import { SdkServiceImplValue, SdkServiceValue } from '@/services/SdkServiceValue.ts'

/**
 * The per-resource service projection family (note 32 §E) —
 * blocking/async × interface/impl. Each projection's constructor
 * rescans the document for the resource's operations (§E-6), so a
 * two-operation resource builds whole on the first insert.
 */
const toServiceProjection = (flavor: ServiceFlavor, role: ServiceRole) => {
  const Base = toServiceBase(flavor, role)

  return class extends Base {
    value: SdkServiceValue | SdkServiceImplValue
    constructorModifiers: string | undefined
    constructorParameters: Stringable | undefined
    supertypes: string[]

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

      const impl = this.value instanceof SdkServiceImplValue ? this.value : undefined
      this.constructorModifiers = impl?.constructorModifiers
      this.constructorParameters = impl?.constructorParameters
      this.supertypes = impl ? impl.supertypes : []
    }

    override toString(): string {
      return `${this.value}`
    }
  }
}

export const KtSdkService = toServiceProjection('blocking', 'interface')
export const KtSdkServiceImpl = toServiceProjection('blocking', 'impl')
export const KtSdkServiceAsync = toServiceProjection('async', 'interface')
export const KtSdkServiceAsyncImpl = toServiceProjection('async', 'impl')
