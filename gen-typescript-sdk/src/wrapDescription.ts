import { List } from '@skmtc/lang-typescript'

/**
 * Greedily wrap `description` text at `width` columns and return the wrapped
 * lines joined by newline — no comment markers. Stainless wraps description
 * text at 80 columns and Prettier preserves comment line breaks (it doesn't
 * reflow prose), so the wrap points must match. The JSDoc comment gutter is the
 * renderer's job: this feeds `TsMethod`'s `description`, which renders it
 * through `withDescription`. (That is why there is no `toJsDoc` here — the
 * gutter rendering it used to duplicate now lives once, in `withDescription`.)
 */
export const wrapDescription = (description: string, width = 80): string => {
  const words = description.trim().split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (current === '') {
      current = word
    } else if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current !== '') {
    lines.push(current)
  }

  return `${List.toLines(lines)}`
}
