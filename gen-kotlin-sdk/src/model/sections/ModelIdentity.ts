import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent } from '@/format.ts'
import type { SdkModel } from '@/model/SdkModel.ts'

type Args = {
  context: GenerateContextType
  model: SdkModel
  destinationPath: string
}

/** `equals` / lazily-cached `hashCode` / string-template `toString`. */
export class ModelIdentity extends KtSnippet {
  model: SdkModel

  constructor({ context, model, destinationPath }: Args) {
    super({ context })
    this.model = model

    this.register({
      imports: { 'java.util': ['Objects'] },
      destinationPath
    })
  }

  override toString(): string {
    const memberNames = [...this.model.fields.map(field => field.kotlinName), 'additionalProperties']

    const comparisons = memberNames.map(name => `${name} == other.${name}`).join(' &&\n')

    const equals = `override fun equals(other: Any?): Boolean {
    if (this === other) {
        return true
    }

${indent(`return other is ${this.model.className} &&\n${indent(comparisons, 1)}`, 1)}
}`

    const hashCode = `private val hashCode: Int by lazy { Objects.hash(${memberNames.join(', ')}) }\n\noverride fun hashCode(): Int = hashCode`

    const parts = memberNames.map(name => `${name}=$${name}`).join(', ')
    const toStringBlock = `override fun toString() =\n    "${this.model.className}{${parts}}"`

    return [equals, hashCode, toStringBlock].join('\n\n')
  }
}
