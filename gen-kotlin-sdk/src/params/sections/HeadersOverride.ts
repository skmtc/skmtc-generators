import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent } from '@/format.ts'
import type { SdkParam } from '@/params/SdkParams.ts'
import { renderParamPut, usesDateTimeFormatter } from '@/params/sections/paramPuts.ts'

type Args = {
  context: GenerateContextType
  headerParams: SdkParam[]
  destinationPath: string
}

/** The `_headers()` override — header-param puts over the additional headers. */
export class HeadersOverride extends KtSnippet {
  headerParams: SdkParam[]

  constructor({ context, headerParams, destinationPath }: Args) {
    super({ context })
    this.headerParams = headerParams

    if (usesDateTimeFormatter(headerParams)) {
      this.register({
        imports: { 'java.time.format': ['DateTimeFormatter'] },
        destinationPath
      })
    }
  }

  override toString(): string {
    if (!this.headerParams.length) {
      return 'override fun _headers(): Headers = additionalHeaders'
    }

    return `override fun _headers(): Headers =
    Headers.builder()
        .apply {
${indent([...this.headerParams.map(renderParamPut), 'putAll(additionalHeaders)'].join('\n'), 3)}
        }
        .build()`
  }
}
