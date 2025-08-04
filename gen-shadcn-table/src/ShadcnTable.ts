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

    this.columnsName = this.insertOperation(TanstackColumns, operation, { noExport: true }).toName()

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
    const { title, description } = this.settings.enrichments?.table ?? {}

    return `(${this.pathParams}) => {
  const { data } = ${this.clientName}(${this.pathParams.destructuredPathParams})

  return (
  <div className="flex flex-col gap-4 p-4">
    ${title || description ? `<div className="flex flex-col gap-2">` : ''}
      ${title ? `<h2 className="text-2xl font-semibold tracking-tight">${title}</h2>` : ''}
      ${description ? `<p className="text-muted-foreground">${description}</p>` : ''}
    ${title || description ? `</div>` : ''}
    <DataTable
      columns={columns}
      data={data ?? []}
      ${this.searchable ? `search={search}` : ''}
      ${this.searchable ? `setSearch={setSearch}` : ''}
    />
  </div>
  )
}`
  }
}
