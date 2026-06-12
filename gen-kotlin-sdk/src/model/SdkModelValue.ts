import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { applyStdlibShadowing, type SdkModel } from './SdkModel.ts'
import {
  constructorModifiers,
  renderModelBody,
  renderPrimaryConstructorParameters,
  type RenderContext
} from './renderModel.ts'
import { toModelImports } from './modelImports.ts'

export type SdkModelValueArgs = {
  context: GenerateContextType
  model: SdkModel
  renderContext: RenderContext
  basePackage: string
  destinationPath: string
  fileHeader: string
}

/**
 * The file-level VALUE for a model class. Carries the `KtConstructed`
 * protocol (primary constructor + `@JsonCreator(…DISABLED) private`
 * modifiers) for `KtDefinition`'s `class` shell; `toString()` renders
 * the §C3 section set over the domain record. Registers the imports
 * the rendered sections need (T2) plus the attribution header.
 */
export class SdkModelValue extends KtSnippet {
  model: SdkModel
  renderContext: RenderContext

  constructor({
    context,
    model,
    renderContext,
    basePackage,
    destinationPath,
    fileHeader
  }: SdkModelValueArgs) {
    super({ context })
    this.model = applyStdlibShadowing(model, new Set())
    this.renderContext = renderContext

    this.register({
      imports: toModelImports({
        model,
        basePackage,
        exceptionPrefix: renderContext.exceptionPrefix,
        envelopeClassName: renderContext.envelope?.className
      }),
      fileHeader,
      destinationPath
    })
  }

  get constructorModifiers(): string {
    return constructorModifiers
  }

  get constructorParameters(): string {
    return renderPrimaryConstructorParameters(this.model)
  }

  override toString(): string {
    return renderModelBody(this.model, this.renderContext)
  }
}
