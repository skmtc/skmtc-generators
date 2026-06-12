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

/** The `@JsonCreator` secondary constructor delegating to the primary. */
export class SecondaryConstructor extends KtSnippet {
  model: SdkModel

  constructor({ context, model, renderContext, destinationPath }: Args) {
    super({ context })
    this.model = model

    this.register({
      imports: {
        'com.fasterxml.jackson.annotation': ['JsonCreator', 'JsonProperty'],
        [`${renderContext.basePackage}.core`]: ['ExcludeMissing', 'JsonField', 'JsonMissing'],
        ...toFieldTypeImports(model.fields, renderContext)
      },
      destinationPath
    })
  }

  override toString(): string {
    const parameters = this.model.fields
      .map(
        field =>
          `@JsonProperty("${field.wireName}") @ExcludeMissing ${field.kotlinName}: JsonField<${toTypeExpression(field.type)}> = JsonMissing.of(),`
      )
      .join('\n')

    const forwarded = [...this.model.fields.map(field => field.kotlinName), 'mutableMapOf()'].join(
      ', '
    )

    return `@JsonCreator\nprivate constructor(\n${indent(parameters, 1)}\n) : this(${forwarded})`
  }
}
