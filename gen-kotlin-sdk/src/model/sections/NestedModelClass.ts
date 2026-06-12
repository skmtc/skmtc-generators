import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent, kdoc } from '@/format.ts'
import type { RenderContext } from '@/RenderContext.ts'
import type { SdkModel } from '@/model/SdkModel.ts'
import { ModelClassBody } from '@/model/sections/ModelClassBody.ts'
import { PrimaryConstructorParameters } from '@/model/sections/PrimaryConstructorParameters.ts'

type Args = {
  context: GenerateContextType
  model: SdkModel
  renderContext: RenderContext
  destinationPath: string
}

/** A nested inline-schema class: declaration shell + recursive section set. */
export class NestedModelClass extends KtSnippet {
  model: SdkModel
  parameters: PrimaryConstructorParameters
  body: ModelClassBody

  constructor({ context, model, renderContext, destinationPath }: Args) {
    super({ context })
    this.model = model
    this.parameters = new PrimaryConstructorParameters({
      context,
      model,
      renderContext,
      destinationPath
    })
    this.body = new ModelClassBody({ context, model, renderContext, destinationPath })
  }

  override toString(): string {
    const description = this.model.description ? `${kdoc([this.model.description])}\n` : ''

    return `${description}class ${this.model.className}
@JsonCreator(mode = JsonCreator.Mode.DISABLED)
private constructor(
${this.parameters}
) {
${indent(`${this.body}`, 1)}
}`
  }
}
