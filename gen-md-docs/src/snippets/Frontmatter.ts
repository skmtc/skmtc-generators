import { SnippetBase, type GenerateContextType, type OasOperation } from '@skmtc/core'
import { Loop, Maybe, Wrap } from '../Maybe.ts'

type FrontmatterArgs = {
  context: GenerateContextType
  operation: OasOperation
  servers?: string[]
}

/**
 * Renders the document's YAML frontmatter — a queryable metadata block an agent
 * or retrieval layer can read from the opening lines without parsing the body.
 * Absent fields are omitted so every emitted line carries meaning; `type` /
 * `method` / `path` are always present.
 */
export class Frontmatter extends SnippetBase {
  content: Wrap

  constructor({ context, operation, servers }: FrontmatterArgs) {
    super({ context, stackTrail: operation.stackTrail.clone() })

    // A defined-but-empty summary or id still renders (`title: ""`), so presence
    // is decided on `undefined`, not by `Maybe`'s blank check.
    const title = operation.summary !== undefined ? new YamlString(operation.summary) : undefined
    const operationId =
      operation.operationId !== undefined ? new YamlString(operation.operationId) : undefined

    const lines = new Loop(
      [
        'type: operation',
        new Maybe(title, value => new Wrap(['title: ', value])),
        new Maybe(operationId, value => new Wrap(['operationId: ', value])),
        new Wrap(['method: ', operation.method.toUpperCase()]),
        new Wrap(['path: ', new YamlString(operation.path)]),
        new Maybe(servers, values => new YamlList({ key: 'servers', values })),
        new Maybe(operation.tags, values => new YamlList({ key: 'tags', values })),
        new Maybe(operation.deprecated, () => 'deprecated: true')
      ],
      { separator: '\n' }
    )

    this.content = new Wrap(['---\n', lines, '\n---'])
  }

  override toString(): string {
    return `${this.content}`
  }
}

type YamlListArgs = {
  key: string
  values: string[]
}

/** A named YAML block list. Built only for a non-empty list of values. */
class YamlList {
  key: string
  items: Loop

  constructor({ key, values }: YamlListArgs) {
    this.key = key
    this.items = new Loop(
      values.map(value => new Wrap(['  - ', new YamlString(value)])),
      { separator: '\n' }
    )
  }

  toString(): string {
    return `${this.key}:\n${this.items}`
  }
}

/** A safely double-quoted YAML scalar — paths, titles and ids carry `:` `{` `#`. */
class YamlString {
  value: string

  constructor(value: string) {
    this.value = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  }

  toString(): string {
    return `"${this.value}"`
  }
}
