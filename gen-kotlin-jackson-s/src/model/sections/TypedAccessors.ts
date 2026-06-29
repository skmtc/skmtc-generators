import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import type { ModelField } from '@/model/ModelField.ts'

type Args = {
  context: GenerateContextType
  fields: ModelField[]
}

/** The typed accessor per field: `fun x(): T = x.getRequired("x")` / `getNullable`. */
export class TypedAccessors extends KtSnippet {
  fields: ModelField[]

  constructor({ context, fields }: Args) {
    super({ context })
    this.fields = fields
  }

  override toString(): string {
    return this.fields.map(field => field.typedAccessor()).join('\n\n')
  }
}
