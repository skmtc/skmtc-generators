import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent, kdoc } from '@/format.ts'
import { isValidatable, type SdkModel } from '@/model/SdkModel.ts'

type Args = {
  context: GenerateContextType
  model: SdkModel
}

/** The `validity()` score used by best-match union deserialization. */
export class ValidityScore extends KtSnippet {
  model: SdkModel

  constructor({ context, model }: Args) {
    super({ context })
    this.model = model
  }

  override toString(): string {
    const terms = this.model.fields.map(field => {
      const name = field.kotlinName

      if (field.type.kind === 'list') {
        return isValidatable(field.type.element)
          ? `(${name}.asKnown()?.sumOf { it.validity().toInt() } ?: 0)`
          : `(${name}.asKnown()?.size ?: 0)`
      }

      if (isValidatable(field.type)) {
        return `(${name}.asKnown()?.validity() ?: 0)`
      }

      return `(if (${name}.asKnown() == null) 0 else 1)`
    })

    return `${kdoc([
      'Returns a score indicating how many valid values are contained in this object recursively.',
      '',
      'Used for best match union deserialization.'
    ])}
internal fun validity(): Int =
${indent(terms.join(' +\n'), 1)}`
  }
}
