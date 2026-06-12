import type { GenerateContextType } from '@skmtc/core'
import { KtAnnotation, KtSnippet } from '@skmtc/lang-kotlin'
import type { RenderContext } from '@/RenderContext.ts'
import { toBodySnippet, type BodySnippet } from '@/params/body/BodySnippet.ts'
import type { SdkParams } from '@/params/SdkParams.ts'
import { ParamsClassBody } from '@/params/sections/ParamsClassBody.ts'
import { ParamsConstructorParameters } from '@/params/sections/ParamsConstructorParameters.ts'

export type SdkParamsValueArgs = {
  context: GenerateContextType
  model: SdkParams
  renderContext: RenderContext
  destinationPath: string
  fileHeader: string
}

/**
 * The file-level VALUE for a Params class (§D-3). The request-body
 * shape is chosen ONCE here (`toBodySnippet`); every section reads
 * the chosen Snippet's contributions. Protocol members
 * (`KtConstructed`, `KtSupertyped`, `KtDocumented`, `KtAnnotated`)
 * are plain fields.
 */
export class SdkParamsValue extends KtSnippet {
  description: string
  annotations: KtAnnotation[]
  constructorModifiers = 'private'
  constructorParameters: ParamsConstructorParameters
  supertypes = ['Params']
  body: BodySnippet
  classBody: ParamsClassBody

  constructor({ context, model, renderContext, destinationPath, fileHeader }: SdkParamsValueArgs) {
    super({ context })

    this.description = model.description
    this.annotations = model.deprecated
      ? [new KtAnnotation('Deprecated', [JSON.stringify(model.deprecated)])]
      : []

    this.body = toBodySnippet({ context, body: model.body, renderContext, destinationPath })

    // The construction and fence axes — decided once, read by the
    // companion and the Builder.
    const hasNone = !model.params.some(param => param.required) && !this.body.hasRequired
    const fenceNames = [
      ...model.params.filter(param => param.required).map(param => param.kotlinName),
      ...this.body.fenceFields
    ]

    this.constructorParameters = new ParamsConstructorParameters({
      context,
      params: model.params,
      body: this.body,
      renderContext,
      destinationPath
    })

    this.classBody = new ParamsClassBody({
      context,
      model,
      body: this.body,
      hasNone,
      fenceNames,
      renderContext,
      destinationPath
    })

    this.register({
      imports: { [`${renderContext.basePackage}.core`]: ['Params'] },
      fileHeader,
      destinationPath
    })
  }

  override toString(): string {
    return `${this.classBody}`
  }
}
