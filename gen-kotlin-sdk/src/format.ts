/**
 * Leaf grammar helpers used inside `toString()` bodies — the only
 * function position string helpers are allowed to occupy
 * (docs/extending/generator-code-quality.md, Rule 1).
 */

const indentUnit = '    '

export const indent = (text: string, levels: number): string => {
  const prefix = indentUnit.repeat(levels)

  return text
    .split('\n')
    .map(line => (line.length ? `${prefix}${line}` : line))
    .join('\n')
}

export const kdoc = (lines: string[]): string => {
  // Entries may themselves be multi-line (spec descriptions with
  // embedded newlines) — split so every physical line gets a margin.
  const split = lines.flatMap(line => line.split('\n'))

  return ['/**', ...split.map(line => (line.length ? ` * ${line}` : ' *')), ' */'].join('\n')
}
