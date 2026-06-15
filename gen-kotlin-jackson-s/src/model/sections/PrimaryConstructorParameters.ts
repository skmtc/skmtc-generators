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

/** The primary-constructor parameter list — the `KtConstructed` protocol value. */
export class PrimaryConstructorParameters extends KtSnippet {
  fields: ModelField[]

  constructor({ context, fields, destinationPath }: Args) {
    super({ context })
    this.fields = fields

    const config = getModelConfig(context)

    this.register({
      imports: { [`${config.basePackage}.core`]: ['JsonField', 'JsonValue'] },
      destinationPath
    })
  }

  override toString(): string {
    const fieldLines = this.fields.map(
      field => `private val ${field.kotlinName}: JsonField<${field.type}>,`
    )

    return indent(
      [...fieldLines, 'private val additionalProperties: MutableMap<String, JsonValue>,'].join(
        '\n'
      ),
      1
    )
  }
}
