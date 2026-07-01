import { SnippetBase, type GenerateContextType, type OasOperation } from '@skmtc/core'

type FrontmatterArgs = {
  context: GenerateContextType
  operation: OasOperation
}

/**
 * Renders the document's YAML frontmatter — a queryable metadata block an agent
 * or retrieval layer can read from the opening lines without parsing the body.
 * Absent fields are omitted so every emitted line carries meaning; `type` /
 * `method` / `path` are always present.
 */
export class Frontmatter extends SnippetBase {
  lines: string[]

  constructor({ context, operation }: FrontmatterArgs) {
    super({ context, stackTrail: operation.stackTrail.clone() })

    this.lines = [
      'type: operation',
      ...(operation.summary !== undefined ? [`title: ${toYamlString(operation.summary)}`] : []),
      ...(operation.operationId !== undefined
        ? [`operationId: ${toYamlString(operation.operationId)}`]
        : []),
      `method: ${operation.method.toUpperCase()}`,
      `path: ${toYamlString(operation.path)}`,
      ...toTagLines(operation.tags),
      ...(operation.deprecated === true ? ['deprecated: true'] : [])
    ]
  }

  override toString(): string {
    return ['---', ...this.lines, '---'].join('\n')
  }
}

/** A YAML block list for tags, or nothing when there are none. */
const toTagLines = (tags: string[] | undefined): string[] =>
  tags !== undefined && tags.length > 0
    ? ['tags:', ...tags.map(tag => `  - ${toYamlString(tag)}`)]
    : []

/** A safely double-quoted YAML scalar — paths, titles and ids carry `:` `{` `#`. */
const toYamlString = (value: string): string =>
  `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}"`
