import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import type { ParamField } from '@/params/ParamField.ts'

type Args = {
  context: GenerateContextType
  params: ParamField[]
}

/** The per-param accessor block — each producer renders `fun x(): T? = x` with its description KDoc. */
export class ParamAccessors extends KtSnippet {
  params: ParamField[]

  constructor({ context, params }: Args) {
    super({ context })
    this.params = params
  }

  override toString(): string {
    return this.params.map(param => param.accessor()).join('\n\n')
  }
}
