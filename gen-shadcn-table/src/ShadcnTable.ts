import invariant from 'tiny-invariant'
import type { OperationInsertableArgs } from '@skmtc/core'
import { TanstackColumns } from './TanstackColumns.ts'
import { TanstackQuery, toListItem } from '@skmtc/gen-tanstack-query-zod'
import { ShadcnTableBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import { PathParams } from './PathParams.ts'
import { Identifier } from '@skmtc/core'

export class ShadcnTable extends ShadcnTableBase {
  columnsName: string
  clientName: string
  searchable: boolean
  pathParams: PathParams
  constructor({ context, operation, settings }: OperationInsertableArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const listItemRef = toListItem({ operation })

    const listItem = listItemRef.resolve()

    invariant(listItem.type === 'object', 'Expected object type')

    const searchParameter = operation.parameters?.find(parameter => {
      const { location, name } = parameter.resolve()
      return location === 'query' && name === 'search'
    })

    this.searchable = Boolean(searchParameter)

    this.columnsName = this.insertOperation(TanstackColumns, operation).toName()

    this.clientName = this.insertOperation(TanstackQuery, operation).toName()

    this.pathParams = new PathParams({
      context,
      operation,
      settings: {
        ...settings,
        identifier: Identifier.createVariable('pathParams')
      }
    })

    const setStateImport = this.searchable ? { react: ['useState'] } : undefined

    this.register({
      imports: {
        '@/components/data-table/data-table.tsx': ['DataTable'],
        ...setStateImport
      }
    })
  }

  override toString(): string {
    return `(${this.pathParams}) => {
  const { data } = ${this.clientName}(${this.pathParams.destructuredPathParams})

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      ${this.searchable ? `search={search}` : ''}
      ${this.searchable ? `setSearch={setSearch}` : ''}
    />
  )
}`
  }
}
