import type {
  OasOperationProjectionConstructorArgs,
  Stringable,
  ToOasOperationExportPathArgs,
  ToOasOperationIdentifierNameArgs
} from '@skmtc/core'
import { SdkBase, toResourceName, toServiceExportPath } from '@/base.ts'
import type { EnrichmentSchema } from '@/enrichments.ts'
import { toServiceProtocol, toServiceValue } from '@/services/toServiceValue.ts'
import type { SdkServiceImplValue, SdkServiceValue } from '@/services/SdkServiceValue.ts'

/** The blocking service interface — `<Stem>Service`. */
export class KtSdkService extends SdkBase {
  static override toIdentifierName = (
    args: ToOasOperationIdentifierNameArgs<EnrichmentSchema>
  ): string => toResourceName(args, 'Service')

  static override toIdentifierType = () => ({ kind: 'interface' as const })

  static override toExportPath = (
    args: ToOasOperationExportPathArgs<EnrichmentSchema>
  ): string => toServiceExportPath(args, 'blocking', toResourceName(args, 'Service'))

  value: SdkServiceValue | SdkServiceImplValue
  constructorModifiers: string | undefined
  constructorParameters: Stringable | undefined
  supertypes: string[]

  constructor(args: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super(args)

    this.value = toServiceValue(args, 'blocking', 'interface')

    const protocol = toServiceProtocol(this.value)
    this.constructorModifiers = protocol.constructorModifiers
    this.constructorParameters = protocol.constructorParameters
    this.supertypes = protocol.supertypes
  }

  override toString(): string {
    return `${this.value}`
  }
}
