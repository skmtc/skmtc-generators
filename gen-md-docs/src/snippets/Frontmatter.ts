import { SnippetBase, type GenerateContextType, type OasOperation } from '@skmtc/core'
import { Loop, Maybe, Wrap } from '@/src/Maybe.ts'

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

    const lines = new Loop(
      [
        'type: operation',
        new Maybe(operation.summary, value => new Wrap(['title: ', new YamlString(value)])),
        new Maybe(
          operation.operationId,
          value => new Wrap(['operationId: ', new YamlString(value)])
        ),
        new Wrap(['method: ', operation.method.toUpperCase()]),
        new Wrap(['path: ', new YamlString(operation.path)]),
        Maybe.nonEmpty(servers, values => new YamlList({ key: 'servers', values })),
        Maybe.nonEmpty(operation.tags, values => new YamlList({ key: 'tags', values })),
        Maybe.when(operation.deprecated === true, () => 'deprecated: true')
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
  values: readonly string[]
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
