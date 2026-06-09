import { SnippetBase } from '@skmtc/core'
import type { GenerateContextType, Stringable } from '@skmtc/core'

const COMPONENT_BY_SIZE = {
  default: 'InputWrap',
  full: 'InputWrapFull'
} as const

export type InputWrapperSize = keyof typeof COMPONENT_BY_SIZE

export type InputWrapperArgs = {
  context: GenerateContextType
  child: Stringable
  destinationPath: string
  size?: InputWrapperSize
}

/**
 * Wraps a single field (or other content) in a Reapit `<InputWrap>` /
 * `<InputWrapFull>` so it participates in the form's CSS grid layout.
 *
 * `<InputWrap>` (default) spans 4 grid columns — full width on mobile,
 * half on desktop, a third on wide screens, etc. — so adjacent fields
 * naturally pair as the viewport grows. `<InputWrapFull>` always spans
 * the entire row, used for section headings (Subtitle) and any field
 * that shouldn't share a row.
 */
export class InputWrapper extends SnippetBase {
  readonly child: Stringable
  readonly size: InputWrapperSize

  constructor({ context, child, destinationPath, size = 'default' }: InputWrapperArgs) {
    super({ context })
    this.child = child
    this.size = size

    this.register({
      destinationPath,
      imports: { '@reapit/elements': [COMPONENT_BY_SIZE[size]] }
    })
  }

  override toString(): string {
    const tag = COMPONENT_BY_SIZE[this.size]
    return `<${tag}>${this.child.toString()}</${tag}>`
  }
}
