import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent } from '@/format.ts'
import { toSdkConfig } from '@/config.ts'
import type { BodySnippet } from '@/params/body/BodySnippet.ts'
import type { ParamField } from '@/params/ParamField.ts'

type Args = {
  context: GenerateContextType
  params: ParamField[]
  body: BodySnippet
  destinationPath: string
}

/** The private-constructor parameter list — the `KtConstructed` protocol value. */
export class ParamsConstructorParameters extends KtSnippet {
  params: ParamField[]
  body: BodySnippet

  constructor({ context, params, body, destinationPath }: Args) {
    super({ context })
    this.params = params
    this.body = body

    const config = toSdkConfig(context)

    this.register({
      imports: { [`${config.basePackage}.core.http`]: ['Headers', 'QueryParams'] },
      destinationPath
    })
  }

  override toString(): string {
    return indent(
      [
        ...this.params.map(param => param.constructorParameter()),
        ...this.body.constructorLeadLines,
        'private val additionalHeaders: Headers,',
        'private val additionalQueryParams: QueryParams,',
        ...this.body.constructorTailLines
      ].join('\n'),
      1
    )
  }
}
