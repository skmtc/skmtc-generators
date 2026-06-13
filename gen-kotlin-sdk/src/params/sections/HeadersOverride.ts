import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent } from '@/format.ts'
import type { ParamField } from '@/params/ParamField.ts'

type Args = {
  context: GenerateContextType
  headerParams: ParamField[]
}

/** The `_headers()` override — header-param puts over the additional headers. */
export class HeadersOverride extends KtSnippet {
  headerParams: ParamField[]

  constructor({ context, headerParams }: Args) {
    super({ context })
    this.headerParams = headerParams
  }

  override toString(): string {
    if (!this.headerParams.length) {
      return 'override fun _headers(): Headers = additionalHeaders'
    }

    return `override fun _headers(): Headers =
    Headers.builder()
        .apply {
${indent([...this.headerParams.map(param => param.put()), 'putAll(additionalHeaders)'].join('\n'), 3)}
        }
        .build()`
  }
}
