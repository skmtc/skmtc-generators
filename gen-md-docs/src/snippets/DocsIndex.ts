import {
  SnippetBase,
  type GenerateContextType,
  type OasSecurityScheme,
  type OasRef
} from '@skmtc/core'
import { type ExternalDocsData } from './ExternalDocs.ts'
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

/**
 * The top-level discovery entry-point (`docs/index.md`) — the API's version and
 * description, its servers and authentication, and a lightweight tag directory
 * an agent reads first, then follows a tag to its per-tag index. Untagged
 * operations are listed directly.
 */
export class TopIndex extends SnippetBase {
  title: string
  version: string | undefined
  description: string | undefined
  servers: Server[]
  externalDocs: ExternalDocsData | undefined
  securitySchemes: SecuritySchemes
  entries: IndexEntry[]

  constructor({ context, title, version, description, servers, externalDocs, securitySchemes }: TopIndexArgs) {
    super({ context })

    this.title = title
    this.version = version
    this.description = description
    this.servers = servers
    this.externalDocs = externalDocs
    this.securitySchemes = securitySchemes
    this.entries = []
  }

  add(entry: IndexEntry): void {
    this.entries.push(entry)
  }

  override toString(): string {
    const { groups, untagged } = toGroups(this.entries)
    const count = this.entries.length

    const sections = [
      `# ${this.title}`,
      this.version !== undefined ? `> Version ${this.version}.` : '',
      this.description ?? '',
      toExternalDocsLink(this.externalDocs),
      toServersSection(this.servers),
      toAuthSection(this.securitySchemes),
      [
        '## Operations',
        `> Reference for ${count} operation${count === 1 ? '' : 's'}, grouped by tag.`,
        groups
          .map(
            ({ folder, tag, count: n }) =>
              `- [${tag}](${folder}/index.md) — ${n} operation${n === 1 ? '' : 's'}`
          )
          .join('\n')
      ]
        .filter(part => part !== '')
        .join('\n\n'),
      untagged.length > 0
        ? ['## Other', untagged.map(toOperationLink).join('\n')].join('\n\n')
        : ''
    ]

    return sections.filter(part => part !== '').join('\n\n')
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
  tag: string
  description: string | undefined
  externalDocs: ExternalDocsData | undefined
  entries: IndexEntry[]

  constructor({ context, tag, description, externalDocs }: TagIndexArgs) {
    super({ context })

    this.tag = tag
    this.description = description
    this.externalDocs = externalDocs
    this.entries = []
  }

  add(entry: IndexEntry): void {
    this.entries.push(entry)
  }

  override toString(): string {
    const links = this.entries.map(
      entry => `- [${entry.title}](${entry.file}) — \`${entry.method}\` \`${entry.path}\``
    )

    return [
      `# ${this.tag}`,
      this.description ?? '',
      toExternalDocsLink(this.externalDocs),
      links.join('\n')
    ]
      .filter(part => part !== '')
      .join('\n\n')
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

type Group = {
  folder: string
  tag: string
  count: number
}

/** Entries grouped by tag folder (alphabetical) plus the untagged entries. */
const toGroups = (entries: IndexEntry[]): { groups: Group[]; untagged: IndexEntry[] } => {
  const byFolder = new Map<string, Group>()
  const untagged: IndexEntry[] = []

  for (const entry of entries) {
    if (entry.tagFolder === '') {
      untagged.push(entry)
      continue
    }

    const group = byFolder.get(entry.tagFolder)

    if (group) {
      group.count += 1
    } else {
      byFolder.set(entry.tagFolder, { folder: entry.tagFolder, tag: entry.tags[0] ?? entry.tagFolder, count: 1 })
    }
  }

  const groups = [...byFolder.values()].sort((a, b) => a.tag.localeCompare(b.tag))

  return { groups, untagged }
}

const toOperationLink = (entry: IndexEntry): string =>
  `- [${entry.title}](${entry.link}) — \`${entry.method}\` \`${entry.path}\``

const toExternalDocsLink = (externalDocs: ExternalDocsData | undefined): string =>
  externalDocs !== undefined
    ? `**See also:** [${externalDocs.description ?? externalDocs.url}](${externalDocs.url})`
    : ''

const toServersSection = (servers: Server[]): string =>
  servers.length > 0
    ? [
        '## Servers',
        servers
          .map(server => `- \`${server.url}\`${server.description ? ` — ${server.description}` : ''}`)
          .join('\n')
      ].join('\n\n')
    : ''

const toAuthSection = (securitySchemes: SecuritySchemes): string => {
  const schemes = Object.entries(securitySchemes ?? {}).flatMap(([name, scheme]) => {
    const resolved = safeResolve(scheme)

    return resolved !== undefined ? [`- \`${name}\` — ${toSchemeDetail(resolved)}`] : []
  })

  return schemes.length > 0 ? ['## Authentication', schemes.join('\n')].join('\n\n') : ''
}

const toSchemeDetail = (scheme: OasSecurityScheme): string => {
  const description =
    scheme.description !== undefined && scheme.description !== '' ? ` — ${scheme.description}` : ''

  switch (scheme.type) {
    case 'http':
      return `HTTP ${scheme.scheme}${scheme.bearerFormat !== undefined ? ` (${scheme.bearerFormat})` : ''}${description}`
    case 'apiKey':
      return `API key in ${scheme.location} \`${scheme.name}\`${description}`
    case 'oauth2':
      return `${toOAuth2Detail(scheme)}${description}`
    case 'openIdConnect':
      return `OpenID Connect (\`${scheme.openIdConnectUrl}\`)${description}`
    default: {
      const exhaustive: never = scheme
      throw new Error(`Unhandled security scheme: ${JSON.stringify(exhaustive)}`)
    }
  }
}

const toOAuth2Detail = (scheme: Extract<OasSecurityScheme, { type: 'oauth2' }>): string => {
  const { flows } = scheme
  const flowParts = [
    flows.authorizationCode !== undefined
      ? `authorization code (authorize \`${flows.authorizationCode.authorizationUrl}\`, token \`${flows.authorizationCode.tokenUrl}\`)`
      : undefined,
    flows.clientCredentials !== undefined
      ? `client credentials (token \`${flows.clientCredentials.tokenUrl}\`)`
      : undefined,
    flows.implicit !== undefined
      ? `implicit (authorize \`${flows.implicit.authorizationUrl}\`)`
      : undefined,
    flows.password !== undefined ? `password (token \`${flows.password.tokenUrl}\`)` : undefined
  ].filter((part): part is string => part !== undefined)

  const scopes = {
    ...flows.implicit?.scopes,
    ...flows.password?.scopes,
    ...flows.clientCredentials?.scopes,
    ...flows.authorizationCode?.scopes
  }
  const scopeParts = Object.entries(scopes).map(
    ([name, detail]) => `\`${name}\`${detail ? ` (${detail})` : ''}`
  )

  const flowText = flowParts.length > 0 ? ` — ${flowParts.join('; ')}` : ''
  const scopeText = scopeParts.length > 0 ? `; scopes: ${scopeParts.join(', ')}` : ''

  return `OAuth2${flowText}${scopeText}`
}
