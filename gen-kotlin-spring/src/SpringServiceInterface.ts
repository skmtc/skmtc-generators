import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import type { KtFunctionSignature } from '@skmtc/lang-kotlin'

type SpringServiceInterfaceArgs = {
  context: GenerateContextType
}

/**
 * The accumulated body of one `<Tag>Service` interface — the seam the
 * consumer implements as a Spring bean. Abstract signatures only, no
 * annotations, no Spring imports. The VALUE renders everything after
 * the declaration head (lang-kotlin's head+value model), so the braces
 * are this class's to emit.
 */
export class SpringServiceInterface extends KtSnippet {
  methods: KtFunctionSignature[] = []

  constructor({ context }: SpringServiceInterfaceArgs) {
    super({ context })
  }

  add(method: KtFunctionSignature): void {
    this.methods.push(method)
  }

  override toString(): string {
    return ` {\n${this.methods.map(method => `${method}`).join('\n\n')}\n}`
  }
}
