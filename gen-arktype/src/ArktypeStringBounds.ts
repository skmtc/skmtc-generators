import { type GenerateContextType, SnippetBase } from '@skmtc/core'
import { formatKeywords } from './formats.ts'

type ArktypeStringBoundsArgs = {
  context: GenerateContextType
  format: string | undefined
  minLength: number | undefined
  maxLength: number | undefined
}

/**
 * A string's keyword (`string`, or the keyword of its format) with its
 * lengths, in arktype string syntax: `(1 <= string.email <= 20)`.
 */
export class ArktypeStringBounds extends SnippetBase {
  keyword: string
  minLength: number | undefined
  maxLength: number | undefined

  constructor({ context, format, minLength, maxLength }: ArktypeStringBoundsArgs) {
    super({ context })

    // A format arktype has no keyword for stays a plain string.
    this.keyword = (format === undefined ? undefined : formatKeywords.get(format)) ?? 'string'
    this.minLength = minLength
    this.maxLength = maxLength
  }

  override toString(): string {
    const { keyword, minLength, maxLength } = this

    // The trap: `string <= 20[]` parses, and bounds the array, not the
    // string. So a bound is in parentheses, wherever a parent puts it.
    if (minLength !== undefined && maxLength !== undefined) {
      return `(${minLength} <= ${keyword} <= ${maxLength})`
    }

    if (minLength !== undefined) {
      return `(${keyword} >= ${minLength})`
    }

    return maxLength === undefined ? keyword : `(${keyword} <= ${maxLength})`
  }
}
