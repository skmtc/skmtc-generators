import { List, type ListArray } from '@skmtc/lang-typescript'
import type { Stringable, OasOperationProjectionConstructorArgs } from '@skmtc/core'
import { TanstackQueryBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import { QueryFn } from './QueryFn.ts'

export class QueryEndpoint extends TanstackQueryBase {
  queryFn: QueryFn
  queryTags: ListArray<Stringable>
  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
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
