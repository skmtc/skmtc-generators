import type { OasOperationProjectionConstructorArgs, Stringable } from '@skmtc/core'
import type { KtAnnotation } from '@skmtc/lang-kotlin'
import { ParamsBase } from '@/base.ts'
import type { SdkOperationEnrichment } from '@/enrichments.ts'
import { generatedFileHeader } from '@/generatedFileHeader.ts'
import { SdkParamsValue } from '@/params/SdkParamsValue.ts'
import { ensureSharedModels } from '@/sharedModels.ts'

/** The per-operation Params class (note 32 §D + the F3 body axis). */
export class KtSdkParams extends ParamsBase {
  value: SdkParamsValue
  description: string
  annotations: KtAnnotation[]
  constructorModifiers: string
  constructorParameters: Stringable
  supertypes: string[]

  constructor(args: OasOperationProjectionConstructorArgs<SdkOperationEnrichment>) {
    super(args)

    const { context, operation, settings } = args

    const { sharedHashes } = ensureSharedModels(context)

    this.value = new SdkParamsValue({
      context,
      operation,
      className: settings.identifier.name,
      deprecatedMessage: settings.enrichments?.deprecatedMessage,
      sharedHashes,
      destinationPath: settings.exportPath,
      fileHeader: generatedFileHeader
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
