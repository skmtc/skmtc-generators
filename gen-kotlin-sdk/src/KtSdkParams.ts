import type { OasOperationProjectionConstructorArgs, Stringable } from '@skmtc/core'
import type { KtAnnotation } from '@skmtc/lang-kotlin'
import { ParamsBase } from '@/base.ts'
import { sdkConfig as config } from '@/config.ts'
import type { SdkOperationEnrichment } from '@/enrichments.ts'
import { generatedFileHeader } from '@/generatedFileHeader.ts'
import { toSdkParams } from '@/params/SdkParams.ts'
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

    const { sharedHashes, renderContext } = ensureSharedModels({ context, config })

    this.value = new SdkParamsValue({
      context,
      model: toSdkParams({
        operation,
        className: settings.identifier.name,
        fieldEnums: config.fieldEnums,
        fieldStates: config.fieldStates,
        sharedHashes,
        hoistField: config.hoistField,
        modelComponents: config.modelComponents,
        kotlinNames: config.kotlinNames,
        deprecatedMessage: settings.enrichments?.deprecatedMessage
      }),
      renderContext,
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
