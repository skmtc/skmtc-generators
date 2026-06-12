import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent } from '@/format.ts'
import type { ModelField } from '@/model/ModelField.ts'

type Args = {
  context: GenerateContextType
  className: string
  fields: ModelField[]
  destinationPath: string
}

/** `equals` / lazily-cached `hashCode` / string-template `toString`. */
export class ModelIdentity extends KtSnippet {
  className: string
  fields: ModelField[]

  constructor({ context, className, fields, destinationPath }: Args) {
    super({ context })
    this.className = className
    this.fields = fields

    this.register({
      imports: { 'java.util': ['Objects'] },
      destinationPath
    })
  }

  override toString(): string {
    const memberNames = [...this.fields.map(field => field.kotlinName), 'additionalProperties']

    const comparisons = memberNames.map(name => `${name} == other.${name}`).join(' &&\n')

    const equals = `override fun equals(other: Any?): Boolean {
    if (this === other) {
        return true
    }

${indent(`return other is ${this.className} &&\n${indent(comparisons, 1)}`, 1)}
}`

    const hashCode = `private val hashCode: Int by lazy { Objects.hash(${memberNames.join(', ')}) }\n\noverride fun hashCode(): Int = hashCode`

    const parts = memberNames.map(name => `${name}=$${name}`).join(', ')
    const toStringBlock = `override fun toString() =\n    "${this.className}{${parts}}"`

    return [equals, hashCode, toStringBlock].join('\n\n')
  }
}
