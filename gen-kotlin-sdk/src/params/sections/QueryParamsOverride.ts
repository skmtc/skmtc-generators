import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent } from '@/format.ts'
import type { SdkParam } from '@/params/SdkParams.ts'
import { renderParamPut, usesDateTimeFormatter } from '@/params/sections/paramPuts.ts'

type Args = {
  context: GenerateContextType
  queryParams: SdkParam[]
  destinationPath: string
}

/** The `_queryParams()` override — query-param puts over the additional params. */
export class QueryParamsOverride extends KtSnippet {
  queryParams: SdkParam[]

  constructor({ context, queryParams, destinationPath }: Args) {
    super({ context })
    this.queryParams = queryParams

    if (usesDateTimeFormatter(queryParams)) {
      this.register({
        imports: { 'java.time.format': ['DateTimeFormatter'] },
        destinationPath
      })
    }
  }

  override toString(): string {
    if (!this.queryParams.length) {
      return 'override fun _queryParams(): QueryParams = additionalQueryParams'
    }

    return `override fun _queryParams(): QueryParams =
    QueryParams.builder()
        .apply {
${indent([...this.queryParams.map(renderParamPut), 'putAll(additionalQueryParams)'].join('\n'), 3)}
        }
        .build()`
  }
}
