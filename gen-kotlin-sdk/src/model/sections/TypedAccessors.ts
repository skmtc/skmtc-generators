import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { kdoc } from '@/format.ts'
import { optionalThrows, requiredThrows, type RenderContext } from '@/RenderContext.ts'
import { toTypeExpression, type SdkField } from '@/model/SdkModel.ts'
import { toFieldTypeImports } from '@/model/sections/fieldTypeImports.ts'

type Args = {
  context: GenerateContextType
  fields: SdkField[]
  renderContext: RenderContext
  destinationPath: string
}

/** The typed accessor per field: `fun x(): T = x.getRequired("x")` / `getNullable`. */
export class TypedAccessors extends KtSnippet {
  fields: SdkField[]
  renderContext: RenderContext

  constructor({ context, fields, renderContext, destinationPath }: Args) {
    super({ context })
    this.fields = fields
    this.renderContext = renderContext

    this.register({
      imports: toFieldTypeImports(fields, renderContext),
      destinationPath
    })
  }

  override toString(): string {
    return this.fields.map(field => this.renderOne(field)).join('\n\n')
  }

  private renderOne(field: SdkField): string {
    const typeExpression = toTypeExpression(field.type)
    const lines = field.description ? [field.description, ''] : []
    lines.push(field.docRequired ? requiredThrows(this.renderContext) : optionalThrows(this.renderContext))

    const accessor =
      field.required && !field.nullable
        ? `fun ${field.kotlinName}(): ${typeExpression} = ${field.kotlinName}.getRequired("${field.wireName}")`
        : `fun ${field.kotlinName}(): ${typeExpression}? = ${field.kotlinName}.getNullable("${field.wireName}")`

    return `${kdoc(lines)}\n${accessor}`
  }
}
