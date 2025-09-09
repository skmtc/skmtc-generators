import type { Modifiers } from '@skmtc/core'

export function applyModifiers(content: string, modifiers: Modifiers): string {
  const parts = [content]

  if (modifiers.nullable) {
    parts.push('null')
  }

  if (!modifiers.required) {
    parts.push('undefined')
  }

  if (parts.length === 1) {
    return `type("${content}")`
  }

  return `type("${parts.join(' | ')}")`
}