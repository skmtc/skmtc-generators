import type {
  OasOperationProjectionConstructorArgs,
  ToOasOperationExportPathArgs,
  ToOasOperationIdentifierNameArgs
} from '@skmtc/core'
import { SdkBase, toResourceName, toServiceExportPath } from '@/base.ts'
import type { EnrichmentSchema } from '@/enrichments.ts'
import { SdkServiceImplValue } from '@/services/SdkServiceImplValue.ts'

/** The async service impl — `<Stem>ServiceAsyncImpl`. */
export class KtSdkServiceAsyncImpl extends SdkBase {
  static override toIdentifierName = (
    args: ToOasOperationIdentifierNameArgs<EnrichmentSchema>
  ): string => toResourceName(args, 'ServiceAsyncImpl')

  static override toIdentifierType = () => ({ kind: 'class' as const })

  static override toExportPath = (
    args: ToOasOperationExportPathArgs<EnrichmentSchema>
  ): string => toServiceExportPath(args, 'async', toResourceName(args, 'ServiceAsyncImpl'))

  value: SdkServiceImplValue
  // The Driver wraps the PROJECTION, so the `class` shell's KtConstructed /
  // KtSupertyped protocol is mirrored here from the value (the spec-28 gotcha).
  constructorModifiers: string
  constructorParameters: string
  supertypes: string[]

  constructor(args: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super(args)

    this.value = new SdkServiceImplValue({
      context: args.context,
      operation: args.operation,
      destinationPath: args.settings.exportPath,
      flavor: 'async'
    })

    this.constructorModifiers = this.value.constructorModifiers
    this.constructorParameters = this.value.constructorParameters
    this.supertypes = this.value.supertypes
  }

  override toString(): string {
    return `${this.value}`
  }
}
