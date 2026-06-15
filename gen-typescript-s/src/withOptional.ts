import type { Stringable } from '@skmtc/core'
import type { Modifiers } from '@skmtc/core'

export const withOptional = (value: Stringable, { required }: Modifiers): string => {
  if (required) {
    return `${value}`
  }
  
  // Only add parentheses if the value contains a union (|) at the top level
  const valueStr = `${value}`
  const needsParens = valueStr.includes(' | ')
  
  return needsParens ? `(${valueStr}) | undefined` : `${valueStr} | undefined`
}
