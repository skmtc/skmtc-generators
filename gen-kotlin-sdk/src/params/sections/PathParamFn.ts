import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent } from '@/format.ts'
import type { SdkParam } from '@/params/SdkParams.ts'

type Args = {
  context: GenerateContextType
  pathParams: SdkParam[]
}

/** `_pathParam(index)` — positional path segments for the service Impl. */
export class PathParamFn extends KtSnippet {
  pathParams: SdkParam[]

  constructor({ context, pathParams }: Args) {
    super({ context })
    this.pathParams = pathParams
  }

  override toString(): string {
    const arms = this.pathParams.map((param, index) => {
      const isString = param.type.kind === 'scalar' && param.type.kotlin === 'String'
      const value = isString
        ? `${param.kotlinName}${param.required ? '' : ' ?: ""'}`
        : param.required
          ? `${param.kotlinName}.toString()`
          : `${param.kotlinName}?.toString() ?: ""`

      return `${index} -> ${value}`
    })

    return `fun _pathParam(index: Int): String =
    when (index) {
${indent([...arms, 'else -> ""'].join('\n'), 2)}
    }`
  }
}
