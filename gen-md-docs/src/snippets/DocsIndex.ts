import {
  SnippetBase,
  type GenerateContextType,
  type OasSecurityScheme,
  type OasRef
} from '@skmtc/core'
import { ExternalDocs, type ExternalDocsData } from './ExternalDocs.ts'
import { safeResolve } from '../safeResolve.ts'
import { Loop, Maybe, Wrap } from '../Maybe.ts'

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

/**
 * The top-level discovery entry-point (`docs/index.md`) — the API's version and
 * description, its servers and authentication, and a lightweight tag directory
 * an agent reads first, then follows a tag to its per-tag index. Untagged
 * operations are listed directly.
 *
 * An accumulator: the static sections are built in the constructor, and
 * {@link add} fills the operation count, the tag groups (kept in tag order) and
 * the untagged links before render.
 */
export class TopIndex extends SnippetBase {
  count: OperationCount
  groups: Loop<TagGroup>
  untagged: Loop<OperationLink>
  content: Loop

  constructor({
    context,
    title,
    version,
    description,
    servers,
    externalDocs,
    securitySchemes
  }: TopIndexArgs) {
    super({ context })

    this.count = new OperationCount()
    this.groups = new Loop([], { separator: '\n' })
    this.untagged = new Loop([], { separator: '\n' })

    const serverLines = new Loop(
      servers.map(
        server =>
          new Wrap([
            '- `',
            server.url,
            '`',
            new Maybe(server.description, text => new Wrap([' — ', text]))
          ])
      ),
      { separator: '\n' }
    )
    const schemeLines = new Loop(
      Object.entries(securitySchemes ?? {}).map(
        ([name, scheme]) =>
          new Maybe(
            safeResolve(scheme),
            resolved =>
              new Wrap(['- `', name, '` — ', new SchemeDetail({ context, scheme: resolved })])
          )
      ),
      { separator: '\n' }
    )

    this.content = new Loop(
      [
        new Wrap(['# ', title]),
        new Maybe(version, value => new Wrap(['> Version ', value, '.'])),
        new Maybe(description),
        new ExternalDocs({ context, externalDocs }).content,
        new Maybe(serverLines, loop => new Wrap(['## Servers\n\n', loop])),
        new Maybe(schemeLines, loop => new Wrap(['## Authentication\n\n', loop])),
        new Loop(
          [
            '## Operations',
            new Wrap(['> Reference for ', this.count, ', grouped by tag.']),
            this.groups
          ],
          { separator: '\n\n' }
        ),
        new Maybe(this.untagged, loop => new Wrap(['## Other\n\n', loop]))
      ],
      { separator: '\n\n' }
    )
  }

  add(entry: IndexEntry): void {
    this.count.value += 1

    if (entry.tagFolder === '') {
      this.untagged.add(
        new OperationLink({
          title: entry.title,
          href: entry.link,
          method: entry.method,
          path: entry.path
        })
      )

      return
    }

    const group = this.groups.items.find(candidate => candidate?.folder === entry.tagFolder)

    if (group) {
      group.count.value += 1

      return
    }

    const created = new TagGroup({ folder: entry.tagFolder, tag: entry.tags[0] ?? entry.tagFolder })
    const before = this.groups.items.findIndex(
      candidate =>
        candidate !== undefined &&
        candidate !== null &&
        created.tag.localeCompare(candidate.tag) < 0
    )

    this.groups.items.splice(before === -1 ? this.groups.items.length : before, 0, created)
  }

  override toString(): string {
    return `${this.content}`
  }
}

type TagIndexArgs = {
  context: GenerateContextType
  tag: string
  description: string | undefined
  externalDocs: ExternalDocsData | undefined
}

/** A per-tag index (`docs/<tag>/index.md`) — its description and operations. */
export class TagIndex extends SnippetBase {
  links: Loop<OperationLink>
  content: Loop

  constructor({ context, tag, description, externalDocs }: TagIndexArgs) {
    super({ context })

    this.links = new Loop([], { separator: '\n' })
    this.content = new Loop(
      [
        new Wrap(['# ', tag]),
        new Maybe(description),
        new ExternalDocs({ context, externalDocs }).content,
        this.links
      ],
      { separator: '\n\n' }
    )
  }

  add(entry: IndexEntry): void {
    this.links.add(
      new OperationLink({
        title: entry.title,
        href: entry.file,
        method: entry.method,
        path: entry.path
      })
    )
  }

  override toString(): string {
    return `${this.content}`
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

/** A running operation count, e.g. `1 operation` or `3 operations`. */
class OperationCount {
  value = 0

  toString(): string {
    return `${this.value} operation${this.value === 1 ? '' : 's'}`
  }
}

type TagGroupArgs = {
  folder: string
  tag: string
}

/** One tag's line in the top index — a link to its per-tag index and its count. */
class TagGroup {
  folder: string
  tag: string
  count: OperationCount

  constructor({ folder, tag }: TagGroupArgs) {
    this.folder = folder
    this.tag = tag
    this.count = new OperationCount()
    this.count.value = 1
  }

  toString(): string {
    return `- [${this.tag}](${this.folder}/index.md) — ${this.count}`
  }
}

type OperationLinkArgs = {
  title: string
  href: string
  method: string
  path: string
}

/** A link to one operation document with its method and path. */
class OperationLink {
  content: Wrap

  constructor({ title, href, method, path }: OperationLinkArgs) {
    this.content = new Wrap(['- [', title, '](', href, ') — `', method, '` `', path, '`'])
  }

  toString(): string {
    return `${this.content}`
  }
}

type SchemeDetailArgs = {
  context: GenerateContextType
  scheme: OasSecurityScheme
}

/** A security scheme's kind and details, then its description. */
class SchemeDetail extends SnippetBase {
  content: Wrap

  constructor({ context, scheme }: SchemeDetailArgs) {
    super({ context })

    const description = new Maybe(scheme.description, text => new Wrap([' — ', text]))

    switch (scheme.type) {
      case 'http':
        this.content = new Wrap([
          'HTTP ',
          scheme.scheme,
          new Maybe(scheme.bearerFormat, format => new Wrap([' (', format, ')'])),
          description
        ])
        break
      case 'apiKey':
        this.content = new Wrap([
          'API key in ',
          scheme.location,
          ' `',
          scheme.name,
          '`',
          description
        ])
        break
      case 'oauth2':
        this.content = new Wrap([new OAuth2Detail({ context, flows: scheme.flows }), description])
        break
      case 'openIdConnect':
        this.content = new Wrap(['OpenID Connect (`', scheme.openIdConnectUrl, '`)', description])
        break
      default: {
        const exhaustive: never = scheme
        throw new Error(`Unhandled security scheme: ${JSON.stringify(exhaustive)}`)
      }
    }
  }

  override toString(): string {
    return `${this.content}`
  }
}

type OAuth2DetailArgs = {
  context: GenerateContextType
  flows: Extract<OasSecurityScheme, { type: 'oauth2' }>['flows']
}

/** An OAuth2 scheme's flows (with their URLs) and the union of their scopes. */
class OAuth2Detail extends SnippetBase {
  content: Wrap

  constructor({ context, flows }: OAuth2DetailArgs) {
    super({ context })

    const flowParts = new Loop(
      [
        new Maybe(
          flows.authorizationCode,
          flow =>
            new Wrap([
              'authorization code (authorize `',
              flow.authorizationUrl,
              '`, token `',
              flow.tokenUrl,
              '`)'
            ])
        ),
        new Maybe(
          flows.clientCredentials,
          flow => new Wrap(['client credentials (token `', flow.tokenUrl, '`)'])
        ),
        new Maybe(
          flows.implicit,
          flow => new Wrap(['implicit (authorize `', flow.authorizationUrl, '`)'])
        ),
        new Maybe(flows.password, flow => new Wrap(['password (token `', flow.tokenUrl, '`)']))
      ],
      { separator: '; ' }
    )

    const scopes = {
      ...flows.implicit?.scopes,
      ...flows.password?.scopes,
      ...flows.clientCredentials?.scopes,
      ...flows.authorizationCode?.scopes
    }
    const scopeParts = new Loop(
      Object.entries(scopes).map(
        ([name, detail]) =>
          new Wrap(['`', name, '`', new Maybe(detail, text => new Wrap([' (', text, ')']))])
      )
    )

    this.content = new Wrap([
      'OAuth2',
      new Maybe(flowParts, loop => new Wrap([' — ', loop])),
      new Maybe(scopeParts, loop => new Wrap(['; scopes: ', loop]))
    ])
  }

  override toString(): string {
    return `${this.content}`
  }
}
