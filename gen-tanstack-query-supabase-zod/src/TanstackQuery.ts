import type { OasOperationProjectionConstructorArgs } from '@skmtc/core'
import { QueryEndpoint } from './QueryEndpoint.ts'
import { PaginatedQueryEndpoint } from './PaginatedQueryEndpoint.ts'
import { MutationEndpoint } from './MutationEndpoint.ts'
import { TanstackQueryBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import { isListResponse } from './listFns.ts'

export class TanstackQuery extends TanstackQueryBase {
  client: PaginatedQueryEndpoint | QueryEndpoint | MutationEndpoint

  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    this.client = toClient({ context, operation, settings })
  }

  override toString(): string {
    return this.client.toString()
  }
}

type ToClientArgs = Pick<
  OasOperationProjectionConstructorArgs<EnrichmentSchema>,
  'context' | 'operation' | 'settings'
>

const toClient = ({ context, operation, settings }: ToClientArgs) => {
  if (operation.method !== 'get') {
    return new MutationEndpoint({ context, operation, settings })
  }

  return isListResponse(operation)
    ? new PaginatedQueryEndpoint({ context, operation, settings })
    : new QueryEndpoint({ context, operation, settings })
}
