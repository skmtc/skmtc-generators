import { SnippetBase, type GenerateContextType } from '@skmtc/core'

type UnresolvedMarkerArgs = {
  context: GenerateContextType
}

/**
 * The marker after the type, parameter `$ref`, status code or name of
 * something whose `$ref` names nothing, as the hub's Markdown docs write it:
 * `(unresolved $ref)`.
 */
export class UnresolvedMarker extends SnippetBase {
  constructor({ context }: UnresolvedMarkerArgs) {
    super({ context })
  }

  override toString(): string {
    return '(unresolved $ref)'
  }
}
