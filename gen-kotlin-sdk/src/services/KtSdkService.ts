import type {
  OasOperationProjectionConstructorArgs,
  ToOasOperationExportPathArgs,
  ToOasOperationIdentifierNameArgs
} from '@skmtc/core'
import { SdkBase, toResourceName, toServiceExportPath } from '@/base.ts'
import type { EnrichmentSchema } from '@/enrichments.ts'
import { SdkServiceValue } from '@/services/SdkServiceValue.ts'

/** The blocking service interface — `<Stem>Service`. */
export class KtSdkService extends SdkBase {
  static override toIdentifierName = (
    args: ToOasOperationIdentifierNameArgs<EnrichmentSchema>
  ): string => toResourceName(args, 'Service')

  static override toIdentifierType = () => ({ kind: 'interface' as const })

  static override toExportPath = (
    args: ToOasOperationExportPathArgs<EnrichmentSchema>
  ): string => toServiceExportPath(args, 'blocking', toResourceName(args, 'Service'))

  value: SdkServiceValue

  constructor(args: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super(args)

    this.value = new SdkServiceValue({
      context: args.context,
      operation: args.operation,
      destinationPath: args.settings.exportPath,
      flavor: 'blocking'
    })
  }

  override toString(): string {
    return `${this.value}`
  }
}
