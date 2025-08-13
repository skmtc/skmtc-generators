import type { Stringable, GenerateContext, ListArray } from "jsr:@skmtc/core@^0.0.707";
import { ContentBase, List } from "jsr:@skmtc/core@^0.0.707";

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