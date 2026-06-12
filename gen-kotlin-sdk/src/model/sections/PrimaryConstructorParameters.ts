import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent } from '@/format.ts'
import type { RenderContext } from '@/RenderContext.ts'
import { toTypeExpression, type SdkModel } from '@/model/SdkModel.ts'
import { toFieldTypeImports } from '@/model/sections/fieldTypeImports.ts'

type Args = {
  context: GenerateContextType
  model: SdkModel
  renderContext: RenderContext
  destinationPath: string
}

/** The primary-constructor parameter list — the `KtConstructed` protocol value. */
export class PrimaryConstructorParameters extends KtSnippet {
  model: SdkModel

  constructor({ context, model, renderContext, destinationPath }: Args) {
    super({ context })
    this.model = model

    this.register({
      imports: {
        [`${renderContext.basePackage}.core`]: ['JsonField', 'JsonValue'],
        ...toFieldTypeImports(model.fields, renderContext)
      },
      destinationPath
    })
  }

  override toString(): string {
    const fieldLines = this.model.fields.map(
      field => `private val ${field.kotlinName}: JsonField<${toTypeExpression(field.type)}>,`
    )

    return indent(
      [...fieldLines, 'private val additionalProperties: MutableMap<String, JsonValue>,'].join(
        '\n'
      ),
      1
    )
  }
}
