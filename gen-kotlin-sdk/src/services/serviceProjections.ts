import type {
  OasOperationProjectionConstructorArgs,
  Stringable,
  ToOasOperationExportPathArgs,
  ToOasOperationIdentifierNameArgs
} from '@skmtc/core'
import invariant from 'tiny-invariant'
import {
  resolveEnrichment,
  SdkBase,
  toClassStem,
  toResourceName,
  toServiceExportPath,
  type ServiceFlavor,
  type ServiceRole
} from '@/base.ts'
import { toSdkConfig } from '@/config.ts'
import type { EnrichmentSchema } from '@/enrichments.ts'
import { toSdkService } from '@/services/SdkService.ts'
import { SdkServiceImplValue, SdkServiceValue } from '@/services/SdkServiceValue.ts'

/**
 * The four per-resource service projections — blocking/async × interface/impl,
 * each an explicit class extending the single {@link SdkBase} and overriding
 * its identity statics. Each rescans the resource's operations (§E-6), so a
 * multi-operation resource builds whole on the first operation's insert.
 */

/** Builds the per-resource service value, shared by the four projections. */
const toServiceValue = (
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

type ServiceProtocol = {
  constructorModifiers: string | undefined
  constructorParameters: Stringable | undefined
  supertypes: string[]
}

/** The `KtConstructed`/`KtSupertyped` protocol the Driver reads off the
 * PROJECTION (it wraps the projection, not the value — the spec-28 mirror):
 * impl values carry an `internal constructor` + supertype; interface values
 * render none. */
const toServiceProtocol = (value: SdkServiceValue | SdkServiceImplValue): ServiceProtocol => {
  const impl = value instanceof SdkServiceImplValue ? value : undefined

  return {
    constructorModifiers: impl?.constructorModifiers,
    constructorParameters: impl?.constructorParameters,
    supertypes: impl ? impl.supertypes : []
  }
}

/** A service projection's mirrored value protocol — the fields the four
 * classes share; each constructor assigns them from {@link toServiceProtocol}. */
abstract class ServiceProjection extends SdkBase {
  value: SdkServiceValue | SdkServiceImplValue
  constructorModifiers: string | undefined
  constructorParameters: Stringable | undefined
  supertypes: string[]

  constructor(
    args: OasOperationProjectionConstructorArgs<EnrichmentSchema>,
    flavor: ServiceFlavor,
    role: ServiceRole
  ) {
    super(args)

    this.value = toServiceValue(args, flavor, role)

    const protocol = toServiceProtocol(this.value)
    this.constructorModifiers = protocol.constructorModifiers
    this.constructorParameters = protocol.constructorParameters
    this.supertypes = protocol.supertypes
  }

  override toString(): string {
    return `${this.value}`
  }
}

/** Blocking service interface — `<Stem>Service`. */
export class KtSdkService extends ServiceProjection {
  static override toIdentifierName = (args: ToOasOperationIdentifierNameArgs<EnrichmentSchema>): string =>
    toResourceName(args, 'Service')
  static override toIdentifierType = () => ({ kind: 'interface' as const })
  static override toExportPath = (args: ToOasOperationExportPathArgs<EnrichmentSchema>): string =>
    toServiceExportPath(args, 'blocking', toResourceName(args, 'Service'))

  constructor(args: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super(args, 'blocking', 'interface')
  }
}

/** Blocking service impl — `<Stem>ServiceImpl`. */
export class KtSdkServiceImpl extends ServiceProjection {
  static override toIdentifierName = (args: ToOasOperationIdentifierNameArgs<EnrichmentSchema>): string =>
    toResourceName(args, 'ServiceImpl')
  static override toIdentifierType = () => ({ kind: 'class' as const })
  static override toExportPath = (args: ToOasOperationExportPathArgs<EnrichmentSchema>): string =>
    toServiceExportPath(args, 'blocking', toResourceName(args, 'ServiceImpl'))

  constructor(args: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super(args, 'blocking', 'impl')
  }
}

/** Async service interface — `<Stem>ServiceAsync`. */
export class KtSdkServiceAsync extends ServiceProjection {
  static override toIdentifierName = (args: ToOasOperationIdentifierNameArgs<EnrichmentSchema>): string =>
    toResourceName(args, 'ServiceAsync')
  static override toIdentifierType = () => ({ kind: 'interface' as const })
  static override toExportPath = (args: ToOasOperationExportPathArgs<EnrichmentSchema>): string =>
    toServiceExportPath(args, 'async', toResourceName(args, 'ServiceAsync'))

  constructor(args: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super(args, 'async', 'interface')
  }
}

/** Async service impl — `<Stem>ServiceAsyncImpl`. */
export class KtSdkServiceAsyncImpl extends ServiceProjection {
  static override toIdentifierName = (args: ToOasOperationIdentifierNameArgs<EnrichmentSchema>): string =>
    toResourceName(args, 'ServiceAsyncImpl')
  static override toIdentifierType = () => ({ kind: 'class' as const })
  static override toExportPath = (args: ToOasOperationExportPathArgs<EnrichmentSchema>): string =>
    toServiceExportPath(args, 'async', toResourceName(args, 'ServiceAsyncImpl'))

  constructor(args: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super(args, 'async', 'impl')
  }
}
