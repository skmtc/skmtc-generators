import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent, kdoc } from '@/format.ts'
import type { RenderContext } from '@/RenderContext.ts'
import { isValidatable, type SdkModel } from '@/model/SdkModel.ts'

type Args = {
  context: GenerateContextType
  model: SdkModel
  renderContext: RenderContext
  destinationPath: string
}

/** The `validated` flag + `validate()` + `isValid()` block. */
export class ValidateBlock extends KtSnippet {
  model: SdkModel
  renderContext: RenderContext

  constructor({ context, model, renderContext, destinationPath }: Args) {
    super({ context })
    this.model = model
    this.renderContext = renderContext

    this.register({
      imports: {
        [`${renderContext.basePackage}.errors`]: [
          `${renderContext.exceptionPrefix}InvalidDataException`
        ]
      },
      destinationPath
    })
  }

  override toString(): string {
    const { model, renderContext } = this

    const perField = model.fields.map(field => {
      const call = `${field.kotlinName}()`
      const optionalMark = field.required && !field.nullable ? '' : '?'

      if (field.type.kind === 'list' && isValidatable(field.type.element)) {
        return `${call}${optionalMark}.forEach { it.validate() }`
      }

      if (isValidatable(field.type)) {
        return `${call}${optionalMark}.validate()`
      }

      return call
    })

    return `private var validated: Boolean = false

${kdoc([
      'Validates that the types of all values in this object match their expected types recursively.',
      '',
      'This method is _not_ forwards compatible with new types from the API for existing fields.',
      '',
      `@throws ${renderContext.exceptionPrefix}InvalidDataException if any value type in this object doesn't match its expected type.`
    ])}
fun validate(): ${model.className} = apply {
    if (validated) {
        return@apply
    }

${indent([...perField, 'validated = true'].join('\n'), 1)}
}

fun isValid(): Boolean =
    try {
        validate()
        true
    } catch (e: ${renderContext.exceptionPrefix}InvalidDataException) {
        false
    }`
  }
}
