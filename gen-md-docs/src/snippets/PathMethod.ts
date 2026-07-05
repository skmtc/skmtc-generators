import { SnippetBase, type GenerateContextType } from '@skmtc/core'

type PathMethodArgs = {
  context: GenerateContextType
  method: string
  path: string
}

/**
 * Renders an operation's method and path — the Markdown counterpart of the docs
 * viewer's `OperationPathMethod`, e.g. `` `GET` `/pets/{id}` ``.
 */
export class PathMethod extends SnippetBase {
  method: string
  path: string

  constructor({ context, method, path }: PathMethodArgs) {
    super({ context })

    this.method = method
    this.path = path
  }

  override toString(): string {
    return `\`${this.method.toUpperCase()}\` \`${this.path}\``
  }
}
