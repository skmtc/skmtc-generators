import type { Stringable, OperationInsertableArgs, ListArray } from '@skmtc/core'
import { List } from '@skmtc/core'
import { TanstackQueryBase } from './base.ts'
import { QueryFn } from './QueryFn.ts'

export class QueryEndpoint extends TanstackQueryBase {
  queryFn: QueryFn
  queryTags: ListArray<Stringable>
  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    this.queryFn = new QueryFn({ context, operation, settings })

    const operationTags: Stringable[] = operation.tags?.map(tag => `'${tag}'`) ?? []

    this.queryTags = List.toArray(
      operationTags.concat(this.queryFn.parameter.toPropertyList().values)
    )

    this.register({
      imports: {
        '@tanstack/react-query': ['useQuery']
      }
    })
  }

  override toString(): string {
    return `(${this.queryFn.parameter}) => {
      const result = useQuery({
        queryKey: ${this.queryTags},
        queryFn: ${this.queryFn}
      })

      return result
    }`
  }
}
