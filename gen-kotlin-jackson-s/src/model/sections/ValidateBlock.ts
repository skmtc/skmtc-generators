import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { getModelConfig } from '@/modelConfig.ts'
import { exceptionName } from '@/errors.ts'
import { indent, kdoc } from '@/format.ts'
import type { ModelField } from '@/model/ModelField.ts'

type Args = {
  context: GenerateContextType
  className: string
  fields: ModelField[]
  destinationPath: string
}

/** The `validated` flag + `validate()` + `isValid()` block. */
export class ValidateBlock extends KtSnippet {
  className: string
  fields: ModelField[]

  constructor({ context, className, fields, destinationPath }: Args) {
    super({ context })
    this.className = className
    this.fields = fields

    const config = getModelConfig()

    this.register({
      imports: { [`${config.basePackage}.errors`]: [exceptionName()] },
      destinationPath
    })
  }

  override toString(): string {
    const perField = this.fields.map(field => field.validateTerm())

    return `private var validated: Boolean = false

${kdoc([
      'Validates that the types of all values in this object match their expected types recursively.',
      '',
      'This method is _not_ forwards compatible with new types from the API for existing fields.',
      '',
      `@throws ${exceptionName()} if any value type in this object doesn't match its expected type.`
    ])}
fun validate(): ${this.className} = apply {
    if (validated) {
        return@apply
    }

${indent([...perField, 'validated = true'].join('\n'), 1)}
}

fun isValid(): Boolean =
    try {
        validate()
        true
    } catch (e: ${exceptionName()}) {
        false
    }`
  }
}
