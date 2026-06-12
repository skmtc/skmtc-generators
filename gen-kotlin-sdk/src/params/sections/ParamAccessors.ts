import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { kdoc } from '@/format.ts'
import type { SdkParam } from '@/params/SdkParams.ts'
import { toParamTypeImports } from '@/params/sections/paramTypeImports.ts'
import { typeOf } from '@/params/sections/paramPuts.ts'

type Args = {
  context: GenerateContextType
  params: SdkParam[]
  destinationPath: string
}

/** The per-param accessor: `fun x(): T? = x`, with the query-param description KDoc. */
export class ParamAccessors extends KtSnippet {
  params: SdkParam[]

  constructor({ context, params, destinationPath }: Args) {
    super({ context })
    this.params = params

    this.register({
      imports: toParamTypeImports(params),
      destinationPath
    })
  }

  override toString(): string {
    return this.params.map(param => renderOne(param)).join('\n\n')
  }
}

const renderOne = (param: SdkParam): string => {
  const description = param.description ? `${kdoc([param.description])}\n` : ''
  const nullable = param.required ? '' : '?'

  return `${description}fun ${param.kotlinName}(): ${typeOf(param)}${nullable} = ${param.kotlinName}`
}
