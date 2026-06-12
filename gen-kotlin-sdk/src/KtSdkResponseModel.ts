import type { OasOperationProjectionConstructorArgs, Stringable } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { ResponseModelBase } from '@/base.ts'
import { sdkConfig as config } from '@/config.ts'
import type { SdkOperationEnrichment } from '@/enrichments.ts'
import { generatedFileHeader } from '@/generatedFileHeader.ts'
import { injectDataFields, toSdkModel } from '@/model/toSdkModel.ts'
import { SdkModelValue } from '@/model/SdkModelValue.ts'
import { ensureSharedModels } from '@/sharedModels.ts'

/** The per-operation Response model class (note 32 §C). */
export class KtSdkResponseModel extends ResponseModelBase {
  value: SdkModelValue
  // The Driver wraps the PROJECTION, so the value protocols are
  // mirrored here as plain fields (the spec-28 gotcha).
  constructorModifiers: string
  constructorParameters: Stringable

  constructor(args: OasOperationProjectionConstructorArgs<SdkOperationEnrichment>) {
    super(args)

    const { context, operation, settings } = args

    const { sharedHashes, renderContext } = ensureSharedModels({ context, config })

    const schema = operation.toSuccessResponse()?.resolve().toSchema()?.resolve()

    invariant(
      schema && schema.type === 'object',
      `@skmtc/gen-kotlin-sdk: ${operation.method} ${operation.path} has no object response schema`
    )

    const walked = toSdkModel({
      schema,
      className: settings.identifier.name,
      sharedHashes,
      envelopeFields: config.sharedModels.envelope?.fields,
      fieldStates: config.fieldStates,
      fieldEnums: config.fieldEnums,
      hoistField: config.hoistField,
      kotlinNames: config.kotlinNames
    })

    const addFields = settings.enrichments?.addFields

    const model = addFields?.length
      ? injectDataFields({
          model: walked,
          addFields,
          fieldStates: config.fieldStates,
          hoistField: config.hoistField
        })
      : walked

    this.value = new SdkModelValue({
      context,
      model,
      renderContext,
      destinationPath: settings.exportPath,
      fileHeader: generatedFileHeader
    })
    this.constructorModifiers = this.value.constructorModifiers
    this.constructorParameters = this.value.constructorParameters
  }

  override toString(): string {
    return `${this.value}`
  }
}
