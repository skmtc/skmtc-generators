import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { kdoc } from '@/format.ts'
import type { RenderContext } from '@/RenderContext.ts'
import { toTypeExpression, type SdkField } from '@/model/SdkModel.ts'
import { toFieldTypeImports } from '@/model/sections/fieldTypeImports.ts'

type Args = {
  context: GenerateContextType
  fields: SdkField[]
  renderContext: RenderContext
  destinationPath: string
}

/** The raw accessor per field: `@JsonProperty(...) fun _x(): JsonField<T> = x`. */
export class RawAccessors extends KtSnippet {
  fields: SdkField[]

  constructor({ context, fields, renderContext, destinationPath }: Args) {
    super({ context })
    this.fields = fields

    this.register({
      imports: {
        'com.fasterxml.jackson.annotation': ['JsonProperty'],
        [`${renderContext.basePackage}.core`]: ['ExcludeMissing', 'JsonField'],
        ...toFieldTypeImports(fields, renderContext)
      },
      destinationPath
    })
  }

  override toString(): string {
    return this.fields.map(field => renderOne(field)).join('\n\n')
  }
}

const renderOne = (field: SdkField): string => {
  const typeExpression = toTypeExpression(field.type)

  return (
    kdoc([
      `Returns the raw JSON value of [${field.kotlinName}].`,
      '',
      `Unlike [${field.kotlinName}], this method doesn't throw if the JSON field has an unexpected type.`
    ]) +
    `\n@JsonProperty("${field.wireName}") @ExcludeMissing fun _${field.kotlinName}(): ` +
    `JsonField<${typeExpression}> = ${field.kotlinName}`
  )
}
