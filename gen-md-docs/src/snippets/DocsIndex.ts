import { SnippetBase, type GenerateContextType } from '@skmtc/core'

export type IndexEntry = {
  /** Every tag on the operation (for the JSON catalog). */
  tags: string[]
  /** The kebab folder of the primary tag, or '' when untagged — derived from the link. */
  tagFolder: string
  /** The operation document's file name (a link from within the tag folder). */
  file: string
  /** The operation document's path relative to `docs/` (a link from the root, and the catalog). */
  link: string
  title: string
  method: string
  path: string
  operationId: string | undefined
}

type TopIndexArgs = {
  context: GenerateContextType
  title: string
}

/**
 * The top-level discovery entry-point (`docs/index.md`) — a lightweight tag
 * directory an agent reads first, then follows a tag to its per-tag index. Kept
 * small on purpose (one line per tag, not per operation), so a large API's index
 * stays within an agent's budget. Untagged operations are listed directly.
 */
export class TopIndex extends SnippetBase {
  title: string
  entries: IndexEntry[]

  constructor({ context, title }: TopIndexArgs) {
    super({ context })

    this.title = title
    this.entries = []
  }

  add(entry: IndexEntry): void {
    this.entries.push(entry)
  }

  override toString(): string {
    const count = this.entries.length
    const summary = `> Reference for ${count} operation${count === 1 ? '' : 's'}, grouped by tag.`

    const folders = new Map<string, { tag: string; count: number }>()
    const untagged: IndexEntry[] = []

    for (const entry of this.entries) {
      if (entry.tagFolder === '') {
        untagged.push(entry)
        continue
      }

      const group = folders.get(entry.tagFolder)

      if (group) {
        group.count += 1
      } else {
        folders.set(entry.tagFolder, { tag: entry.tags[0] ?? entry.tagFolder, count: 1 })
      }
    }

    const tagLines = [...folders.entries()]
      .sort((a, b) => a[1].tag.localeCompare(b[1].tag))
      .map(
        ([folder, { tag, count }]) =>
          `- [${tag}](${folder}/index.md) — ${count} operation${count === 1 ? '' : 's'}`
      )

    const parts = [`# ${this.title}`, summary]

    if (tagLines.length > 0) {
      parts.push(tagLines.join('\n'))
    }

    if (untagged.length > 0) {
      parts.push(['## Other', untagged.map(toOperationLink).join('\n')].join('\n\n'))
    }

    return parts.join('\n\n')
  }
}

type TagIndexArgs = {
  context: GenerateContextType
  tag: string
}

/** A per-tag index (`docs/<tag>/index.md`) — its operations, linked within the folder. */
export class TagIndex extends SnippetBase {
  tag: string
  entries: IndexEntry[]

  constructor({ context, tag }: TagIndexArgs) {
    super({ context })

    this.tag = tag
    this.entries = []
  }

  add(entry: IndexEntry): void {
    this.entries.push(entry)
  }

  override toString(): string {
    const links = this.entries.map(
      entry => `- [${entry.title}](${entry.file}) — \`${entry.method}\` \`${entry.path}\``
    )

    return [`# ${this.tag}`, links.join('\n')].join('\n\n')
  }
}

type CatalogArgs = {
  context: GenerateContextType
  title: string
}

/**
 * The machine catalog (`docs/index.json`) — one structured record per operation
 * for programmatic and retrieval (RAG) use: `operationId`, `method`, `path`,
 * `tags`, `summary`, and the document `file`.
 */
export class Catalog extends SnippetBase {
  title: string
  entries: IndexEntry[]

  constructor({ context, title }: CatalogArgs) {
    super({ context })

    this.title = title
    this.entries = []
  }

  add(entry: IndexEntry): void {
    this.entries.push(entry)
  }

  override toString(): string {
    const operations = this.entries.map(entry => ({
      operationId: entry.operationId,
      method: entry.method,
      path: entry.path,
      tags: entry.tags,
      summary: entry.title,
      file: entry.link
    }))

    return JSON.stringify({ title: this.title, operations }, null, 2)
  }
}

/** A root-relative operation link for the untagged section of the top index. */
const toOperationLink = (entry: IndexEntry): string =>
  `- [${entry.title}](${entry.link}) — \`${entry.method}\` \`${entry.path}\``
