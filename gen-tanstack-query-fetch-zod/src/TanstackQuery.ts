import type { OperationInsertableArgs } from '@skmtc/core'
import { match } from 'ts-pattern'
import { QueryEndpoint } from './QueryEndpoint.ts'
import { PaginatedQueryEndpoint } from './PaginatedQueryEndpoint.ts'
import { MutationEndpoint } from './MutationEndpoint.ts'
import { TanstackQueryBase } from './base.ts'
import { isListResponse } from './listFns.ts'

export class TanstackQuery extends TanstackQueryBase {
  client: PaginatedQueryEndpoint | QueryEndpoint | MutationEndpoint

  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    this.client = match(operation)
      .with({ method: 'get' }, () => {
        return isListResponse(operation)
          ? new PaginatedQueryEndpoint({
              context,
              operation,
              settings
            })
          : new QueryEndpoint({
              context,
              operation,
              settings
            })
      })
      .otherwise(() => {
        return new MutationEndpoint({
          context,
          operation,
          settings
        })
      })
  }

  override toString(): string {
    return this.client.toString()
  }
}
