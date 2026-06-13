import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { getModelConfig } from '@/modelConfig.ts'
import { indent } from '@/format.ts'
import type { ModelField } from '@/model/ModelField.ts'

type Args = {
  context: GenerateContextType
  fields: ModelField[]
  destinationPath: string
}

/** The `@JsonCreator` secondary constructor delegating to the primary. */
export class SecondaryConstructor extends KtSnippet {
  fields: ModelField[]

  constructor({ context, fields, destinationPath }: Args) {
    super({ context })
    this.fields = fields

    const config = getModelConfig()

    this.register({
      imports: {
        'com.fasterxml.jackson.annotation': ['JsonCreator', 'JsonProperty'],
        [`${config.basePackage}.core`]: ['ExcludeMissing', 'JsonField', 'JsonMissing']
      },
      destinationPath
    })
  }

  override toString(): string {
    const parameters = this.fields
      .map(
        field =>
          `@JsonProperty("${field.wireName}") @ExcludeMissing ${field.kotlinName}: JsonField<${field.type}> = JsonMissing.of(),`
      )
      .join('\n')

    const forwarded = [...this.fields.map(field => field.kotlinName), 'mutableMapOf()'].join(', ')

    return `@JsonCreator\nprivate constructor(\n${indent(parameters, 1)}\n) : this(${forwarded})`
  }
}
