import type {
  OasOperationProjectionConstructorArgs,
  ToOasOperationExportPathArgs,
  ToOasOperationIdentifierNameArgs
} from '@skmtc/core'
import { SdkBase, toResourceName, toServiceExportPath } from '@/base.ts'
import type { EnrichmentSchema } from '@/enrichments.ts'
import { SdkServiceValue } from '@/services/SdkServiceValue.ts'

/** The async service interface — `<Stem>ServiceAsync`. */
export class KtSdkServiceAsync extends SdkBase {
  static override toIdentifierName = (
    args: ToOasOperationIdentifierNameArgs<EnrichmentSchema>
  ): string => toResourceName(args, 'ServiceAsync')

  static override toIdentifierType = () => ({ kind: 'interface' as const })

  static override toExportPath = (
    args: ToOasOperationExportPathArgs<EnrichmentSchema>
  ): string => toServiceExportPath(args, 'async', toResourceName(args, 'ServiceAsync'))

  value: SdkServiceValue

  constructor(args: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super(args)

    this.value = new SdkServiceValue({
      context: args.context,
      operation: args.operation,
      destinationPath: args.settings.exportPath,
      flavor: 'async'
    })
  }

  override toString(): string {
    return `${this.value}`
  }
}
