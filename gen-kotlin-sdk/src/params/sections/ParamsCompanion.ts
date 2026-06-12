import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import { indent, kdoc } from '@/format.ts'

type Args = {
  context: GenerateContextType
  className: string
  hasNone: boolean
  fenceNames: string[]
}

/** The companion object: `none()` when available + fenced `builder()`. */
export class ParamsCompanion extends KtSnippet {
  className: string
  hasNone: boolean
  fenceNames: string[]

  constructor({ context, className, hasNone, fenceNames }: Args) {
    super({ context })
    this.className = className
    this.hasNone = hasNone
    this.fenceNames = fenceNames
  }

  override toString(): string {
    const fence = this.fenceNames.length
      ? [
          '',
          'The following fields are required:',
          '```kotlin',
          ...this.fenceNames.map(name => `.${name}()`),
          '```'
        ]
      : []

    const members = [
      ...(this.hasNone ? [`fun none(): ${this.className} = builder().build()`] : []),
      kdoc([
        `Returns a mutable builder for constructing an instance of [${this.className}].`,
        ...fence
      ]) + '\nfun builder() = Builder()'
    ]

    return `companion object {\n\n${indent(members.join('\n\n'), 1)}\n}`
  }
}
