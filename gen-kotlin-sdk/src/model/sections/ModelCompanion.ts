import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent, kdoc } from '@/format.ts'
import type { SdkModel } from '@/model/SdkModel.ts'
import { requiredFieldsFence } from '@/model/sections/builderDocs.ts'

type Args = {
  context: GenerateContextType
  model: SdkModel
}

/** The companion object: `builder()` with the required-fields fence. */
export class ModelCompanion extends KtSnippet {
  model: SdkModel

  constructor({ context, model }: Args) {
    super({ context })
    this.model = model
  }

  override toString(): string {
    const lines = [
      `Returns a mutable builder for constructing an instance of [${this.model.className}].`,
      ...requiredFieldsFence(this.model)
    ]

    return `companion object {\n\n${indent(`${kdoc(lines)}\nfun builder() = Builder()`, 1)}\n}`
  }
}
