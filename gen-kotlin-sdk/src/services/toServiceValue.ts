import type { OasOperationProjectionConstructorArgs, Stringable } from '@skmtc/core'
import invariant from 'tiny-invariant'
import {
  resolveEnrichment,
  toClassStem,
  type ServiceFlavor,
  type ServiceRole
} from '@/base.ts'
import { toSdkConfig } from '@/config.ts'
import type { EnrichmentSchema } from '@/enrichments.ts'
import { toSdkService } from '@/services/SdkService.ts'
import { SdkServiceImplValue, SdkServiceValue } from '@/services/SdkServiceValue.ts'

/**
 * Builds a per-resource service value (interface or impl) by rescanning the
 * resource's operations (§E-6), shared by the four service projection classes.
 * A multi-operation resource therefore builds whole on the first operation's
 * insert.
 */
export const toServiceValue = (
  args: OasOperationProjectionConstructorArgs<EnrichmentSchema>,
  flavor: ServiceFlavor,
  role: ServiceRole
): SdkServiceValue | SdkServiceImplValue => {
  const { context, operation, settings } = args
  const config = toSdkConfig(context)
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

  return new ValueClass({
    context,
    service,
    flavor,
    basePackage: config.basePackage,
    destinationPath: settings.exportPath,
    fileHeader: config.fileHeader
  })
}

export type ServiceProtocol = {
  constructorModifiers: string | undefined
  constructorParameters: Stringable | undefined
  supertypes: string[]
}

/**
 * The `KtConstructed`/`KtSupertyped` protocol the Driver reads off the
 * PROJECTION (it wraps the projection, not the value — the spec-28 mirror):
 * impl values carry an `internal constructor` + supertype; interface values
 * render none. Each service class mirrors this onto itself in its constructor.
 */
export const toServiceProtocol = (
  value: SdkServiceValue | SdkServiceImplValue
): ServiceProtocol => {
  const impl = value instanceof SdkServiceImplValue ? value : undefined

  return {
    constructorModifiers: impl?.constructorModifiers,
    constructorParameters: impl?.constructorParameters,
    supertypes: impl ? impl.supertypes : []
  }
}
