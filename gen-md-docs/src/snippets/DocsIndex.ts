import {
  SnippetBase,
  type GenerateContextType,
  type OasSecurityScheme,
  type OasRef
} from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { Bullet } from './Bullet.ts'
import { Description, DescriptionClause } from './Description.ts'
import { ExternalDocs, type ExternalDocsData } from './ExternalDocs.ts'
import { Heading } from './Heading.ts'
import { InlineCode } from './InlineCode.ts'
import { toSchemeDetail, type SchemeDetail } from './SecuritySchemes.ts'
import { UnresolvedMarker } from './Unresolved.ts'
import { safeResolve } from '../safeResolve.ts'

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

export type Server = {
  url: string
  description: string | undefined
}

type SecuritySchemes = Record<string, OasSecurityScheme | OasRef<'securityScheme'>> | undefined

type TopIndexArgs = {
  context: GenerateContextType
  title: string
  version: string | undefined
  description: string | undefined
  servers: Server[]
  externalDocs: ExternalDocsData | undefined
  securitySchemes: SecuritySchemes
}

/** One block of a {@link TopIndex}. */
type TopIndexBlock =
  | Heading
  | VersionNote
  | Description
  | ExternalDocs
  | ServersSection
  | AuthSection
  | OperationsSection
  | OtherOperations

/**
 * The top-level discovery entry-point (`docs/index.md`) — the API's version and
 * description, its servers and authentication, and a lightweight tag directory
 * an agent reads first, then follows a tag to its per-tag index. Untagged
 * operations are listed directly, under `## Other`.
 *
 * An accumulator: the transform adds each operation's {@link IndexEntry}.
 */
export class TopIndex extends SnippetBase {
  blocks: List<TopIndexBlock[], '\n\n', 'none'>
  operations: OperationsSection
  /** The untagged operations; written after the first one is added. */
  other: OtherOperations | undefined

  constructor({ context, title, version, description, servers, externalDocs, securitySchemes }: TopIndexArgs) {
    super({ context })

    const schemes = Object.entries(securitySchemes ?? {})

    this.operations = new OperationsSection({ context })
    this.other = undefined
    this.blocks = new List<TopIndexBlock[], '\n\n', 'none'>(
      [
        new Heading({ context, level: 1, text: title }),
        version !== undefined ? new VersionNote({ context, version }) : undefined,
        description ? new Description({ context, description }) : undefined,
        externalDocs !== undefined ? new ExternalDocs({ context, externalDocs }) : undefined,
        servers.length > 0 ? new ServersSection({ context, servers }) : undefined,
        schemes.length > 0 ? new AuthSection({ context, schemes }) : undefined,
        this.operations
      ],
      { separator: '\n\n' }
    )
  }

  add(entry: IndexEntry): void {
    this.operations.add(entry)

    if (entry.tagFolder !== '') {
      return
    }

    if (this.other === undefined) {
      this.other = new OtherOperations({ context: this.context })
      this.blocks.values.push(this.other)
    }

    this.other.add(entry)
  }

  override toString(): string {
    return `${this.blocks}`
  }
}

type TagIndexArgs = {
  context: GenerateContextType
  tag: string
  description: string | undefined
  externalDocs: ExternalDocsData | undefined
}

/**
 * A per-tag index (`docs/<tag>/index.md`) — its description and its
 * operations, linked within the folder.
 *
 * An accumulator: the transform adds each tagged operation's {@link IndexEntry}.
 */
export class TagIndex extends SnippetBase {
  blocks: List<(Heading | Description | ExternalDocs | List<OperationLink[], '\n', 'none'>)[], '\n\n', 'none'>
  links: List<OperationLink[], '\n', 'none'>

  constructor({ context, tag, description, externalDocs }: TagIndexArgs) {
    super({ context })

    this.links = new List<OperationLink[], '\n', 'none'>([], { separator: '\n' })
    this.blocks = new List<(Heading | Description | ExternalDocs | List<OperationLink[], '\n', 'none'>)[], '\n\n', 'none'>(
      [
        new Heading({ context, level: 1, text: tag }),
        description ? new Description({ context, description }) : undefined,
        externalDocs !== undefined ? new ExternalDocs({ context, externalDocs }) : undefined
      ],
      { separator: '\n\n' }
    )
  }

  add(entry: IndexEntry): void {
    if (this.links.values.length === 0) {
      this.blocks.values.push(this.links)
    }

    this.links.values.push(new OperationLink({ context: this.context, entry, href: entry.file }))
  }

  override toString(): string {
    return `${this.blocks}`
  }
}

type CatalogArgs = {
  context: GenerateContextType
  title: string
  servers: Server[]
}

/**
 * The machine catalog (`docs/index.json`) — the servers and one structured
 * record per operation for programmatic and retrieval (RAG) use.
 */
export class Catalog extends SnippetBase {
  title: string
  servers: Server[]
  entries: IndexEntry[]

  constructor({ context, title, servers }: CatalogArgs) {
    super({ context })

    this.title = title
    this.servers = servers
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

    return JSON.stringify(
      { title: this.title, servers: this.servers.map(server => server.url), operations },
      null,
      2
    )
  }
}

type VersionNoteArgs = {
  context: GenerateContextType
  version: string
}

/** The API's version, as a note: `> Version 1.0.0.`. */
class VersionNote extends SnippetBase {
  version: string

  constructor({ context, version }: VersionNoteArgs) {
    super({ context })

    this.version = version
  }

  override toString(): string {
    return `> Version ${this.version}.`
  }
}

type OperationCountArgs = {
  context: GenerateContextType
  /** The entries counted: the same array its owner grows, so the count follows it. */
  entries: readonly IndexEntry[]
}

/** How many operations an index lists: `1 operation`, `3 operations`. */
class OperationCount extends SnippetBase {
  entries: readonly IndexEntry[]

  constructor({ context, entries }: OperationCountArgs) {
    super({ context })

    this.entries = entries
  }

  override toString(): string {
    return this.entries.length === 1 ? '1 operation' : `${this.entries.length} operations`
  }
}

type OperationsSectionArgs = {
  context: GenerateContextType
}

/**
 * `## Operations`: how many operations the reference covers, then a link to
 * each tag's index with its count, in tag order. The tag list is written once
 * the first tagged operation is added.
 */
class OperationsSection extends SnippetBase {
  entries: IndexEntry[]
  groups: List<TagGroup[], '\n', 'none'>
  blocks: List<(Heading | ReferenceNote | List<TagGroup[], '\n', 'none'>)[], '\n\n', 'none'>

  constructor({ context }: OperationsSectionArgs) {
    super({ context })

    this.entries = []
    this.groups = new List<TagGroup[], '\n', 'none'>([], { separator: '\n' })
    this.blocks = new List<(Heading | ReferenceNote | List<TagGroup[], '\n', 'none'>)[], '\n\n', 'none'>(
      [
        new Heading({ context, level: 2, text: 'Operations' }),
        new ReferenceNote({ context, count: new OperationCount({ context, entries: this.entries }) })
      ],
      { separator: '\n\n' }
    )
  }

  add(entry: IndexEntry): void {
    this.entries.push(entry)

    if (entry.tagFolder === '') {
      return
    }

    const existing = this.groups.values.find(group => group.folder === entry.tagFolder)

    if (existing !== undefined) {
      existing.add(entry)

      return
    }

    const group = new TagGroup({ context: this.context, folder: entry.tagFolder, tag: entry.tags[0] ?? entry.tagFolder })
    const index = this.groups.values.findIndex(other => other.tag.localeCompare(group.tag) > 0)

    if (this.groups.values.length === 0) {
      this.blocks.values.push(this.groups)
    }

    this.groups.values.splice(index === -1 ? this.groups.values.length : index, 0, group)
    group.add(entry)
  }

  override toString(): string {
    return `${this.blocks}`
  }
}

type ReferenceNoteArgs = {
  context: GenerateContextType
  count: OperationCount
}

/** How many operations the reference covers: `> Reference for 3 operations, grouped by tag.`. */
class ReferenceNote extends SnippetBase {
  count: OperationCount

  constructor({ context, count }: ReferenceNoteArgs) {
    super({ context })

    this.count = count
  }

  override toString(): string {
    return `> Reference for ${this.count}, grouped by tag.`
  }
}

type TagGroupArgs = {
  context: GenerateContextType
  folder: string
  tag: string
}

/** One tag's line in the top index, with its count: `- [pets](pets/index.md) — 3 operations`. */
class TagGroup extends SnippetBase {
  folder: string
  tag: string
  entries: IndexEntry[]
  count: OperationCount

  constructor({ context, folder, tag }: TagGroupArgs) {
    super({ context })

    this.folder = folder
    this.tag = tag
    this.entries = []
    this.count = new OperationCount({ context, entries: this.entries })
  }

  add(entry: IndexEntry): void {
    this.entries.push(entry)
  }

  override toString(): string {
    return `- [${this.tag}](${this.folder}/index.md) — ${this.count}`
  }
}

type OtherOperationsArgs = {
  context: GenerateContextType
}

/** `## Other`: the untagged operations, each linked from the docs root. */
class OtherOperations extends SnippetBase {
  heading: Heading
  links: List<OperationLink[], '\n', 'none'>

  constructor({ context }: OtherOperationsArgs) {
    super({ context })

    this.heading = new Heading({ context, level: 2, text: 'Other' })
    this.links = new List<OperationLink[], '\n', 'none'>([], { separator: '\n' })
  }

  add(entry: IndexEntry): void {
    this.links.values.push(new OperationLink({ context: this.context, entry, href: entry.link }))
  }

  override toString(): string {
    return `${this.heading}\n\n${this.links}`
  }
}

type OperationLinkArgs = {
  context: GenerateContextType
  entry: IndexEntry
  /** Where the link points: the file within a tag folder, or the path from the docs root. */
  href: string
}

/** One operation's line in an index: ``- [Get pet](pets-id-GET.md) — `GET` `/pets/{id}` ``. */
class OperationLink extends SnippetBase {
  title: string
  href: string
  method: InlineCode
  path: InlineCode

  constructor({ context, entry, href }: OperationLinkArgs) {
    super({ context })

    this.title = entry.title
    this.href = href
    this.method = new InlineCode({ context, value: entry.method })
    this.path = new InlineCode({ context, value: entry.path })
  }

  override toString(): string {
    return `- [${this.title}](${this.href}) — ${this.method} ${this.path}`
  }
}

type ServersSectionArgs = {
  context: GenerateContextType
  /** The servers: at least one. */
  servers: Server[]
}

/** `## Servers`: each server's URL, with its description when it has one. */
class ServersSection extends SnippetBase {
  heading: Heading
  servers: List<Bullet<List<(InlineCode | DescriptionClause)[], ' ', 'none'>>[], '\n', 'none'>

  constructor({ context, servers }: ServersSectionArgs) {
    super({ context })

    this.heading = new Heading({ context, level: 2, text: 'Servers' })
    this.servers = new List(
      servers.map(
        server =>
          new Bullet({
            context,
            item: new List<(InlineCode | DescriptionClause)[], ' ', 'none'>(
              [
                new InlineCode({ context, value: server.url }),
                server.description
                  ? new DescriptionClause({ context, description: server.description })
                  : undefined
              ],
              { separator: ' ' }
            )
          })
      ),
      { separator: '\n' }
    )
  }

  override toString(): string {
    return `${this.heading}\n\n${this.servers}`
  }
}

type AuthSectionArgs = {
  context: GenerateContextType
  /** The document's security schemes: at least one. */
  schemes: [string, OasSecurityScheme | OasRef<'securityScheme'>][]
}

/** `## Authentication`: each security scheme the document declares, as the index describes it. */
class AuthSection extends SnippetBase {
  heading: Heading
  schemes: List<Bullet<AuthScheme | UnresolvedAuthScheme>[], '\n', 'none'>

  constructor({ context, schemes }: AuthSectionArgs) {
    super({ context })

    this.heading = new Heading({ context, level: 2, text: 'Authentication' })
    this.schemes = new List(
      schemes.map(([name, entry]) => {
        const scheme = safeResolve(entry)

        return new Bullet({
          context,
          item:
            scheme !== undefined
              ? new AuthScheme({ context, name, scheme })
              : new UnresolvedAuthScheme({ context, name })
        })
      }),
      { separator: '\n' }
    )
  }

  override toString(): string {
    return `${this.heading}\n\n${this.schemes}`
  }
}

type AuthSchemeArgs = {
  context: GenerateContextType
  name: string
  scheme: OasSecurityScheme
}

/** One security scheme in the index: ``\`oauth\` — OAuth2 — client credentials (token `…`) — Our login``. */
class AuthScheme extends SnippetBase {
  parts: List<(InlineCode | SchemeDetail | string)[], ' — ', 'none'>

  constructor({ context, name, scheme }: AuthSchemeArgs) {
    super({ context })

    this.parts = new List<(InlineCode | SchemeDetail | string)[], ' — ', 'none'>(
      [
        new InlineCode({ context, value: name }),
        toSchemeDetail({ context, scheme }),
        scheme.description === '' ? undefined : scheme.description
      ],
      { separator: ' — ' }
    )
  }

  override toString(): string {
    return `${this.parts}`
  }
}

type UnresolvedAuthSchemeArgs = {
  context: GenerateContextType
  name: string
}

/** A security scheme whose `$ref` names nothing: its name and the unresolved marker. */
class UnresolvedAuthScheme extends SnippetBase {
  name: InlineCode
  marker: UnresolvedMarker

  constructor({ context, name }: UnresolvedAuthSchemeArgs) {
    super({ context })

    this.name = new InlineCode({ context, value: name })
    this.marker = new UnresolvedMarker({ context })
  }

  override toString(): string {
    return `${this.name} ${this.marker}`
  }
}
