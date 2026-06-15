/**
 * Render a description as a JSDoc block, greedily wrapping the text at
 * `width` characters per line. Prettier preserves comment line breaks (it
 * doesn't reflow prose), so the wrap points must match Stainless's — which
 * wraps description text at 80 columns. The block is emitted un-indented;
 * Prettier re-indents the `*` gutter to its enclosing scope.
 */
export const toJsDoc = (description: string, width = 80): string => {
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

  return `/**\n${lines.map(line => ` * ${line}`).join('\n')}\n */`
}
