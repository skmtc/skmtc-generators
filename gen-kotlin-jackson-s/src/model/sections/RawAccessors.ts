import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { getModelConfig } from '@/modelConfig.ts'
import type { ModelField } from '@/model/ModelField.ts'

type Args = {
  context: GenerateContextType
  fields: ModelField[]
  destinationPath: string
}

/** The raw accessor per field: `@JsonProperty(...) fun _x(): JsonField<T> = x`. */
export class RawAccessors extends KtSnippet {
  fields: ModelField[]

  constructor({ context, fields, destinationPath }: Args) {
    super({ context })
    this.fields = fields

    const config = getModelConfig()

    this.register({
      imports: {
        'com.fasterxml.jackson.annotation': ['JsonProperty'],
        [`${config.basePackage}.core`]: ['ExcludeMissing', 'JsonField']
      },
      destinationPath
    })
  }

  override toString(): string {
    return this.fields.map(field => field.rawAccessor()).join('\n\n')
  }
}
