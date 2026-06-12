import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent, kdoc } from '@/format.ts'
import type { ModelField } from '@/model/ModelField.ts'

type Args = {
  context: GenerateContextType
  fields: ModelField[]
}

/** The `validity()` score used by best-match union deserialization. */
export class ValidityScore extends KtSnippet {
  fields: ModelField[]

  constructor({ context, fields }: Args) {
    super({ context })
    this.fields = fields
  }

  override toString(): string {
    const terms = this.fields.map(field => field.validityTerm())

    return `${kdoc([
      'Returns a score indicating how many valid values are contained in this object recursively.',
      '',
      'Used for best match union deserialization.'
    ])}
internal fun validity(): Int =
${indent(terms.join(' +\n'), 1)}`
  }
}
