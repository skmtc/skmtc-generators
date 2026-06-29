import type {
  OasOperationProjectionConstructorArgs,
  Stringable,
  ToOasOperationExportPathArgs,
  ToOasOperationIdentifierNameArgs
} from '@skmtc/core'
import type { KtAnnotation } from '@skmtc/lang-kotlin'
import { SdkBase, toModelExportPath, toOperationName } from '@/base.ts'
import { toSdkConfig } from '@/config.ts'
import type { EnrichmentSchema } from '@/enrichments.ts'
import { SdkParamsValue } from '@/params/SdkParamsValue.ts'
import { ensureSharedModels } from '@/sharedModels.ts'

/** The per-operation Params class (note 32 §D + the F3 body axis). */
export class KtSdkParams extends SdkBase {
  static override toIdentifierName = (
    args: ToOasOperationIdentifierNameArgs<EnrichmentSchema>
  ): string => toOperationName(args, 'Params')

  static override toExportPath = (
    args: ToOasOperationExportPathArgs<EnrichmentSchema>
  ): string => toModelExportPath(args, toOperationName(args, 'Params'))

  value: SdkParamsValue
  description: string
  annotations: KtAnnotation[]
  constructorModifiers: string
  constructorParameters: Stringable
  supertypes: string[]

  constructor(args: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super(args)

    const { context, operation, settings } = args
    const config = toSdkConfig(context)

    const { sharedHashes } = ensureSharedModels(context)

    this.value = new SdkParamsValue({
      context,
      operation,
      className: settings.identifier.name,
      deprecatedMessage: settings.enrichments.subject?.deprecatedMessage,
      sharedHashes,
      destinationPath: settings.exportPath,
      fileHeader: config.fileHeader
    })
    this.description = this.value.description
    this.annotations = this.value.annotations
    this.constructorModifiers = this.value.constructorModifiers
    this.constructorParameters = this.value.constructorParameters
    this.supertypes = this.value.supertypes
  }

  override toString(): string {
    return `${this.value}`
  }
}
