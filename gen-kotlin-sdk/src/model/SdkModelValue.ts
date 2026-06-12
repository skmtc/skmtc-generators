import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import type { RenderContext } from '@/RenderContext.ts'
import { applyStdlibShadowing, type SdkModel } from '@/model/SdkModel.ts'
import { ModelClassBody } from '@/model/sections/ModelClassBody.ts'
import { PrimaryConstructorParameters } from '@/model/sections/PrimaryConstructorParameters.ts'

export type SdkModelValueArgs = {
  context: GenerateContextType
  model: SdkModel
  renderContext: RenderContext
  destinationPath: string
  fileHeader: string
}

/**
 * The file-level VALUE for a model class. Carries the `KtConstructed`
 * protocol (primary constructor + `@JsonCreator(…DISABLED) private`
 * modifiers) for `KtDefinition`'s `class` shell; composes the §C3
 * section Snippets once in the constructor — each section registers
 * its own imports (T2) — and `toString()` delegates to the body.
 */
export class SdkModelValue extends KtSnippet {
  // KtConstructed protocol members — plain fields; the protocol takes
  // any Stringable, so the section Snippet itself is the value.
  constructorModifiers = '@JsonCreator(mode = JsonCreator.Mode.DISABLED) private'
  constructorParameters: PrimaryConstructorParameters
  body: ModelClassBody

  constructor({ context, model, renderContext, destinationPath, fileHeader }: SdkModelValueArgs) {
    super({ context })

    const shadowed = applyStdlibShadowing(model, new Set())

    this.constructorParameters = new PrimaryConstructorParameters({
      context,
      model: shadowed,
      renderContext,
      destinationPath
    })
    this.body = new ModelClassBody({ context, model: shadowed, renderContext, destinationPath })

    this.register({ fileHeader, destinationPath })
  }

  override toString(): string {
    return `${this.body}`
  }
}
