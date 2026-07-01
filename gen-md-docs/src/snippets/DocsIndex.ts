import { SnippetBase, type GenerateContextType } from '@skmtc/core'

export type IndexEntry = {
  tag: string
  title: string
  link: string
  method: string
  path: string
}

type DocsIndexArgs = {
  context: GenerateContextType
  title: string
}

/**
 * The documentation index — the discovery entry-point an agent reads first to
 * find the right operation, then follows the link to that self-contained
 * document. One entry per operation accumulates across the run (each operation's
 * transform finds this shared instance and calls {@link add}, gen-msw style),
 * rendered grouped by tag with a link and method/path signature per operation.
 */
export class DocsIndex extends SnippetBase {
  title: string
  entries: IndexEntry[]

  constructor({ context, title }: DocsIndexArgs) {
    super({ context })

    this.title = title
    this.entries = []
  }

  add(entry: IndexEntry): void {
    this.entries.push(entry)
  }

  override toString(): string {
    const count = this.entries.length
    const summary = `> Reference for ${count} operation${count === 1 ? '' : 's'}, each linking to a self-contained document.`
    const sections = toGroups(this.entries).map(group => toSection(group))

    return [`# ${this.title}`, summary, ...sections].join('\n\n')
  }
}

type Group = {
  tag: string
  entries: IndexEntry[]
}

/** Entries grouped by tag — tags alphabetical, the untagged group ("Other") last. */
const toGroups = (entries: IndexEntry[]): Group[] => {
  const byTag = new Map<string, IndexEntry[]>()

  for (const entry of entries) {
    const existing = byTag.get(entry.tag)

    if (existing) {
      existing.push(entry)
    } else {
      byTag.set(entry.tag, [entry])
    }
  }

  return [...byTag.keys()]
    .sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(tag => ({ tag, entries: byTag.get(tag) ?? [] }))
}

const toSection = ({ tag, entries }: Group): string => {
  const heading = tag === '' ? '## Other' : `## ${tag}`
  const links = entries.map(
    entry => `- [${entry.title}](${entry.link}) — \`${entry.method}\` \`${entry.path}\``
  )

  return [heading, links.join('\n')].join('\n\n')
}
