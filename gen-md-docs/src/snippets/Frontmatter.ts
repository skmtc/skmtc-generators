import { SnippetBase, type GenerateContextType, type OasOperation } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'

type FrontmatterArgs = {
  context: GenerateContextType
  operation: OasOperation
  servers: string[]
}

/**
 * Renders the document's YAML frontmatter — a queryable metadata block an agent
 * or retrieval layer can read from the opening lines without parsing the body.
 * Absent fields are left out, so every line carries meaning; `type`, `method`
 * and `path` are always present.
 */
export class Frontmatter extends SnippetBase {
  fields: List<(YamlField | YamlList)[], '\n', 'none'>

  constructor({ context, operation, servers }: FrontmatterArgs) {
    super({ context, stackTrail: operation.stackTrail.clone() })

    const tags = operation.tags ?? []

    this.fields = new List<(YamlField | YamlList)[], '\n', 'none'>(
      [
        new YamlField({ context, key: 'type', value: 'operation' }),
        operation.summary !== undefined
          ? new YamlField({ context, key: 'title', value: new YamlString({ context, value: operation.summary }) })
          : undefined,
        operation.operationId !== undefined
          ? new YamlField({
              context,
              key: 'operationId',
              value: new YamlString({ context, value: operation.operationId })
            })
          : undefined,
        new YamlField({ context, key: 'method', value: operation.method.toUpperCase() }),
        new YamlField({ context, key: 'path', value: new YamlString({ context, value: operation.path }) }),
        servers.length > 0 ? new YamlList({ context, key: 'servers', values: servers }) : undefined,
        tags.length > 0 ? new YamlList({ context, key: 'tags', values: tags }) : undefined,
        operation.deprecated === true ? new YamlField({ context, key: 'deprecated', value: 'true' }) : undefined
      ],
      { separator: '\n' }
    )
  }

  override toString(): string {
    return `---\n${this.fields}\n---`
  }
}

type YamlStringArgs = {
  context: GenerateContextType
  value: string
}

/** A double-quoted YAML scalar, escaped — paths, titles and ids carry `:` `{` `#`. */
export class YamlString extends SnippetBase {
  value: string

  constructor({ context, value }: YamlStringArgs) {
    super({ context })

    this.value = value
  }

  override toString(): string {
    const escaped = this.value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')

    return `"${escaped}"`
  }
}

type YamlFieldArgs = {
  context: GenerateContextType
  key: string
  /** A plain value such as `operation` or `GET`, or a quoted string. */
  value: string | YamlString
}

/** One YAML field: `method: GET`, `path: "/pets/{id}"`. */
export class YamlField extends SnippetBase {
  key: string
  value: string | YamlString

  constructor({ context, key, value }: YamlFieldArgs) {
    super({ context })

    this.key = key
    this.value = value
  }

  override toString(): string {
    return `${this.key}: ${this.value}`
  }
}

type YamlListArgs = {
  context: GenerateContextType
  key: string
  /** The values: at least one. */
  values: string[]
}

/** A YAML block list of quoted strings: `tags:`, then `  - "pets"` per value. */
class YamlList extends SnippetBase {
  key: string
  items: List<YamlListItem[], '\n', 'none'>

  constructor({ context, key, values }: YamlListArgs) {
    super({ context })

    this.key = key
    this.items = new List(
      values.map(value => new YamlListItem({ context, value: new YamlString({ context, value }) })),
      { separator: '\n' }
    )
  }

  override toString(): string {
    return `${this.key}:\n${this.items}`
  }
}

type YamlListItemArgs = {
  context: GenerateContextType
  value: YamlString
}

/** One item of a YAML block list: `  - "pets"`. */
class YamlListItem extends SnippetBase {
  value: YamlString

  constructor({ context, value }: YamlListItemArgs) {
    super({ context })

    this.value = value
  }

  override toString(): string {
    return `  - ${this.value}`
  }
}
