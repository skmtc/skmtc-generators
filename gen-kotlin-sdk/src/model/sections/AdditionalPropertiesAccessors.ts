import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import type { RenderContext } from '@/RenderContext.ts'

type Args = {
  context: GenerateContextType
  renderContext: RenderContext
  destinationPath: string
}

/** The `@JsonAnySetter`/`@JsonAnyGetter` additionalProperties pair. */
export class AdditionalPropertiesAccessors extends KtSnippet {
  constructor({ context, renderContext, destinationPath }: Args) {
    super({ context })

    this.register({
      imports: {
        'com.fasterxml.jackson.annotation': ['JsonAnyGetter', 'JsonAnySetter'],
        'java.util': ['Collections'],
        [`${renderContext.basePackage}.core`]: ['ExcludeMissing', 'JsonValue']
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
