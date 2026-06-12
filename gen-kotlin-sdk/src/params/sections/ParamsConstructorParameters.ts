import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent } from '@/format.ts'
import { sdkConfig as config } from '@/config.ts'
import type { BodySnippet } from '@/params/body/BodySnippet.ts'
import type { SdkParam } from '@/params/SdkParams.ts'
import { toParamTypeImports } from '@/params/sections/paramTypeImports.ts'
import { typeOf } from '@/params/sections/paramPuts.ts'

type Args = {
  context: GenerateContextType
  params: SdkParam[]
  body: BodySnippet
  destinationPath: string
}

/** The private-constructor parameter list — the `KtConstructed` protocol value. */
export class ParamsConstructorParameters extends KtSnippet {
  params: SdkParam[]
  body: BodySnippet

  constructor({ context, params, body, destinationPath }: Args) {
    super({ context })
    this.params = params
    this.body = body

    this.register({
      imports: {
        [`${config.basePackage}.core.http`]: ['Headers', 'QueryParams'],
        ...toParamTypeImports(params)
      },
      destinationPath
    })
  }

  override toString(): string {
    const paramLines = this.params.map(param => {
      const nullable = param.required ? '' : '?'

      return `private val ${param.kotlinName}: ${typeOf(param)}${nullable},`
    })

    return indent(
      [
        ...paramLines,
        ...this.body.constructorLeadLines,
        'private val additionalHeaders: Headers,',
        'private val additionalQueryParams: QueryParams,',
        ...this.body.constructorTailLines
      ].join('\n'),
      1
    )
  }
}
