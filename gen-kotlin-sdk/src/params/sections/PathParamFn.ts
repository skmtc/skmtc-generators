import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent } from '@/format.ts'
import type { ParamField } from '@/params/ParamField.ts'

type Args = {
  context: GenerateContextType
  pathParams: ParamField[]
}

/** `_pathParam(index)` — positional path segments for the service Impl. */
export class PathParamFn extends KtSnippet {
  pathParams: ParamField[]

  constructor({ context, pathParams }: Args) {
    super({ context })
    this.pathParams = pathParams
  }

  override toString(): string {
    const arms = this.pathParams.map((param, index) => param.pathSegment(index))

    return `fun _pathParam(index: Int): String =
    when (index) {
${indent([...arms, 'else -> ""'].join('\n'), 2)}
    }`
  }
}
