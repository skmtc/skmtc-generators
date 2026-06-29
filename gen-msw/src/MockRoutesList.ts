import { List, type ListArray } from '@skmtc/lang-typescript'
import type { Stringable, GenerateContextType } from '@skmtc/core'
import { SnippetBase } from '@skmtc/core'

type ConstructorArgs = {
  context: GenerateContextType
}

export class MockRoutesList extends SnippetBase {
  list: ListArray<Stringable>
  constructor({ context }: ConstructorArgs) {
    super({ context })

    this.list = List.toArray([])
  }

  add(route: Stringable) {
    this.list.values.push(route)
  }

  override toString(): string {
    return `() => ${this.list}`
  }
}
