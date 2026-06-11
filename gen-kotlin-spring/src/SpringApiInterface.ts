import type { GenerateContextType } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import type { SpringApiMethod } from './SpringApiMethod.ts'

type SpringApiInterfaceArgs = {
  context: GenerateContextType
}

/**
 * The accumulated body of one `<Tag>Api` interface — the gen-msw
 * accumulator pattern: the transform `findDefinition`s the tag file's
 * Definition and `add`s a method per operation; this value renders the
 * accumulated methods joined by blank lines (append order = document
 * order, deterministic per document). The interface always has ≥1 method
 * by construction — it is created by the first operation that joins it.
 */
export class SpringApiInterface extends KtSnippet {
  methods: SpringApiMethod[] = []

  constructor({ context }: SpringApiInterfaceArgs) {
    super({ context })
  }

  add(method: SpringApiMethod): void {
    this.methods.push(method)
  }

  override toString(): string {
    return this.methods.map(method => `${method}`).join('\n\n')
  }
}
