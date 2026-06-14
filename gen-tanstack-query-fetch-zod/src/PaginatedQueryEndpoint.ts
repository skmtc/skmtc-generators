import { List, type ListArray } from '@skmtc/lang-typescript'
import type { OasOperationProjectionConstructorArgs, Stringable } from '@skmtc/core'
import { PaginatedQueryFn } from './PaginatedQueryFn.ts'
import { TanstackQueryBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'

export class PaginatedQueryEndpoint extends TanstackQueryBase {
  queryFn: PaginatedQueryFn
  queryTags: ListArray<Stringable>
  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
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
