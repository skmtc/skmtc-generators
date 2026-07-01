import { SnippetBase, type GenerateContextType, type OasOperation } from '@skmtc/core'

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
  lines: string[]

  constructor({ context, operation, servers }: FrontmatterArgs) {
    super({ context, stackTrail: operation.stackTrail.clone() })

    this.lines = [
      'type: operation',
      ...(operation.summary !== undefined ? [`title: ${toYamlString(operation.summary)}`] : []),
      ...(operation.operationId !== undefined
        ? [`operationId: ${toYamlString(operation.operationId)}`]
        : []),
      `method: ${operation.method.toUpperCase()}`,
      `path: ${toYamlString(operation.path)}`,
      ...toListLines('servers', servers),
      ...toListLines('tags', operation.tags),
      ...(operation.deprecated === true ? ['deprecated: true'] : [])
    ]
  }

  override toString(): string {
    return ['---', ...this.lines, '---'].join('\n')
  }
}

/** A named YAML block list, or nothing when there are no values. */
const toListLines = (key: string, values: string[] | undefined): string[] =>
  values !== undefined && values.length > 0
    ? [`${key}:`, ...values.map(value => `  - ${toYamlString(value)}`)]
    : []

/** A safely double-quoted YAML scalar — paths, titles and ids carry `:` `{` `#`. */
const toYamlString = (value: string): string =>
  `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}"`
