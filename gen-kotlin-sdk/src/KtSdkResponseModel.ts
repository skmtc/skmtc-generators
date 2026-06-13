import type { OasOperationProjectionConstructorArgs, Stringable } from '@skmtc/core'
import invariant from 'tiny-invariant'
import { ResponseModelBase } from '@/base.ts'
import type { SdkOperationEnrichment } from '@/enrichments.ts'
import { generatedFileHeader } from '@/generatedFileHeader.ts'
import { SdkModelValue } from '@skmtc/gen-kotlin-jackson-s'
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

    const { sharedHashes } = ensureSharedModels(context)

    const schema = operation.toSuccessResponse()?.resolve().toSchema()?.resolve()

    invariant(
      schema && schema.type === 'object',
      `@skmtc/gen-kotlin-sdk: ${operation.method} ${operation.path} has no object response schema`
    )

    this.value = new SdkModelValue({
      context,
      schema,
      className: settings.identifier.name,
      destinationPath: settings.exportPath,
      fileHeader: generatedFileHeader,
      sharedHashes,
      addFieldsForData: settings.enrichments?.addFields,
      detectEnvelope: true
    })
    this.constructorModifiers = this.value.constructorModifiers
    this.constructorParameters = this.value.constructorParameters
  }

  override toString(): string {
    return `${this.value}`
  }
}
