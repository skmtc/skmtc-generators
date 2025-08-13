import type { Stringable, GenerateContext, ListArray } from '@skmtc/core'
import { ContentBase, List } from '@skmtc/core'

type ConstructorArgs = {
  context: GenerateContext
}

export class MockRoutesList extends ContentBase {
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
