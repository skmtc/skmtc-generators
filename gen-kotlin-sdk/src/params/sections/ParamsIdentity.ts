import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent } from '@/format.ts'

type Args = {
  context: GenerateContextType
  className: string
  /** Member order decided once by the value (params, body, headers/query, body tail). */
  memberNames: string[]
  destinationPath: string
}

/** `equals` / plain `Objects.hash` hashCode (no lazy caching, unlike models) / `toString`. */
export class ParamsIdentity extends KtSnippet {
  className: string
  memberNames: string[]

  constructor({ context, className, memberNames, destinationPath }: Args) {
    super({ context })
    this.className = className
    this.memberNames = memberNames

    this.register({
      imports: { 'java.util': ['Objects'] },
      destinationPath
    })
  }

  override toString(): string {
    const comparisons = this.memberNames.map(name => `${name} == other.${name}`).join(' &&\n')

    const equals = `override fun equals(other: Any?): Boolean {
    if (this === other) {
        return true
    }

${indent(`return other is ${this.className} &&\n${indent(comparisons, 1)}`, 1)}
}`

    const hashCode = `override fun hashCode(): Int = Objects.hash(${this.memberNames.join(', ')})`

    const parts = this.memberNames.map(name => `${name}=$${name}`).join(', ')
    const toStringBlock = `override fun toString() =\n    "${this.className}{${parts}}"`

    return [equals, hashCode, toStringBlock].join('\n\n')
  }
}
