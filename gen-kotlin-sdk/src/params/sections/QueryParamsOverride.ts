import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent } from '@/format.ts'
import type { ParamField } from '@/params/ParamField.ts'

type Args = {
  context: GenerateContextType
  queryParams: ParamField[]
}

/** The `_queryParams()` override — query-param puts over the additional params. */
export class QueryParamsOverride extends KtSnippet {
  queryParams: ParamField[]

  constructor({ context, queryParams }: Args) {
    super({ context })
    this.queryParams = queryParams
  }

  override toString(): string {
    if (!this.queryParams.length) {
      return 'override fun _queryParams(): QueryParams = additionalQueryParams'
    }

    return `override fun _queryParams(): QueryParams =
    QueryParams.builder()
        .apply {
${indent([...this.queryParams.map(param => param.put()), 'putAll(additionalQueryParams)'].join('\n'), 3)}
        }
        .build()`
  }
}
