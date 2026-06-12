import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent, kdoc } from '@/format.ts'
import { requiredFieldsFence, type ModelField } from '@/model/ModelField.ts'

type Args = {
  context: GenerateContextType
  className: string
  fields: ModelField[]
}

/** The companion object: `builder()` with the required-fields fence. */
export class ModelCompanion extends KtSnippet {
  className: string
  fields: ModelField[]

  constructor({ context, className, fields }: Args) {
    super({ context })
    this.className = className
    this.fields = fields
  }

  override toString(): string {
    const lines = [
      `Returns a mutable builder for constructing an instance of [${this.className}].`,
      ...requiredFieldsFence(this.fields)
    ]

    return `companion object {\n\n${indent(`${kdoc(lines)}\nfun builder() = Builder()`, 1)}\n}`
  }
}
