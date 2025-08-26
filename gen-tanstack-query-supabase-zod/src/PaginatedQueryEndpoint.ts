import type { OperationInsertableArgs, Stringable, ListArray } from '@skmtc/core'
import { List } from '@skmtc/core'
import { PaginatedQueryFn } from './PaginatedQueryFn.ts'
import { TanstackQueryBase } from './base.ts'

export class PaginatedQueryEndpoint extends TanstackQueryBase {
  queryFn: PaginatedQueryFn
  queryTags: ListArray<Stringable>
  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    this.queryFn = new PaginatedQueryFn({ context, operation, settings })

    const operationTags: Stringable[] = operation.tags?.map(tag => `'${tag}'`) ?? []

    this.queryTags = List.toArray(
      operationTags.concat(this.queryFn.parameter.toPropertyList().values)
    )

    this.register({
      imports: {
        '@tanstack/react-query': ['useQuery', 'keepPreviousData']
      }
    })
  }

  override toString(): string {
    return `(${this.queryFn.parameter}) => {      
      const result = useQuery({
        queryKey: ${this.queryTags},
        queryFn: ${this.queryFn},
        placeholderData: keepPreviousData
      })

      return result
    }`
  }
}
