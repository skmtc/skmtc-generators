import type { GenerateContextType, Stringable } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { kdoc } from '@/format.ts'
import type { RenderContext } from '@/RenderContext.ts'
import { KnownValueEnum } from '@/model/sections/KnownValueEnum.ts'
import type { BodySnippet } from '@/params/body/BodySnippet.ts'
import type { SdkParams } from '@/params/SdkParams.ts'
import { HeadersOverride } from '@/params/sections/HeadersOverride.ts'
import { ParamAccessors } from '@/params/sections/ParamAccessors.ts'
import { ParamsBuilder } from '@/params/sections/ParamsBuilder.ts'
import { ParamsCompanion } from '@/params/sections/ParamsCompanion.ts'
import { ParamsIdentity } from '@/params/sections/ParamsIdentity.ts'
import { PathParamFn } from '@/params/sections/PathParamFn.ts'
import { QueryParamsOverride } from '@/params/sections/QueryParamsOverride.ts'

type Args = {
  context: GenerateContextType
  model: SdkParams
  body: BodySnippet
  hasNone: boolean
  fenceNames: string[]
  renderContext: RenderContext
  destinationPath: string
}

/** The §D-3 section set in corpus order — composed once; `toString()` joins. */
export class ParamsClassBody extends KtSnippet {
  sections: Stringable[]

  constructor({ context, model, body, hasNone, fenceNames, renderContext, destinationPath }: Args) {
    super({ context })

    const { className, params } = model
    const pathParams = params.filter(param => param.location === 'path')
    const headerParams = params.filter(param => param.location === 'header')
    const queryParams = params.filter(param => param.location === 'query')

    // Member order for equals/hashCode/toString mirrors the
    // constructor-parameter order — decided here, once.
    const memberNames = [
      ...params.map(param => param.kotlinName),
      ...body.equalsLeadNames,
      'additionalHeaders',
      'additionalQueryParams',
      ...body.equalsTailNames
    ]

    this.sections = [
      ...(params.length ? [new ParamAccessors({ context, params, destinationPath })] : []),
      ...body.accessorSections,
      kdoc(['Additional headers to send with the request.']) +
        '\nfun _additionalHeaders(): Headers = additionalHeaders',
      kdoc(['Additional query param to send with the request.']) +
        '\nfun _additionalQueryParams(): QueryParams = additionalQueryParams',
      'fun toBuilder() = Builder().from(this)',
      new ParamsCompanion({ context, className, hasNone, fenceNames }),
      new ParamsBuilder({
        context,
        className,
        params,
        body,
        fenceNames,
        renderContext,
        destinationPath
      }),
      ...body.bodyMethodSections,
      ...(pathParams.length ? [new PathParamFn({ context, pathParams })] : []),
      new HeadersOverride({ context, headerParams, destinationPath }),
      new QueryParamsOverride({ context, queryParams, destinationPath }),
      ...body.nestedSections,
      ...params.flatMap(param => {
        const enumModel =
          param.type.kind === 'enum'
            ? param.type.enumModel
            : param.type.kind === 'list' && param.type.element.kind === 'enum'
              ? param.type.element.enumModel
              : undefined

        return enumModel
          ? [
              new KnownValueEnum({
                context,
                enumModel,
                renderContext,
                destinationPath,
                documentedValidate: true
              })
            ]
          : []
      }),
      new ParamsIdentity({ context, className, memberNames, destinationPath })
    ]
  }

  override toString(): string {
    return `\n${this.sections.join('\n\n')}`
  }
}
