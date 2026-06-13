import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { getModelConfig } from '@/modelConfig.ts'

type Args = {
  context: GenerateContextType
  destinationPath: string
}

/** The `@JsonAnySetter`/`@JsonAnyGetter` additionalProperties pair. */
export class AdditionalPropertiesAccessors extends KtSnippet {
  constructor({ context, destinationPath }: Args) {
    super({ context })

    const config = getModelConfig()

    this.register({
      imports: {
        'com.fasterxml.jackson.annotation': ['JsonAnyGetter', 'JsonAnySetter'],
        'java.util': ['Collections'],
        [`${config.basePackage}.core`]: ['ExcludeMissing', 'JsonValue']
      },
      destinationPath
    })
  }

  override toString(): string {
    return `@JsonAnySetter
private fun putAdditionalProperty(key: String, value: JsonValue) {
    additionalProperties.put(key, value)
}

@JsonAnyGetter
@ExcludeMissing
fun _additionalProperties(): Map<String, JsonValue> =
    Collections.unmodifiableMap(additionalProperties)`
  }
}
