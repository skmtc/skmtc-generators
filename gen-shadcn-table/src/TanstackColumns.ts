import { List, Identifier } from '@skmtc/core'
import { toTsValue } from '@skmtc/gen-typescript'
import invariant from 'tiny-invariant'
import { TableColumn } from './TableColumn.ts'
import type { ListArray, OasOperation, OperationInsertableArgs } from '@skmtc/core'
import { toListItem } from '@skmtc/gen-tanstack-query-zod'
import { ShadcnTableBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'

export class TanstackColumns extends ShadcnTableBase {
  columns: ListArray<TableColumn>
  constructor({ context, operation, settings }: OperationInsertableArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const tableRowSchema = toListItem({ operation })

    invariant(tableRowSchema.isRef(), 'Expected table row schema to be a ref')

    toTsValue({
      context: this.context,
      schema: tableRowSchema,
      destinationPath: settings.exportPath,
      required: true,
      rootRef: tableRowSchema.toRefName()
    })

    const resolved = tableRowSchema.resolve()

    invariant(resolved.type === 'object', 'Expected object type')

    const columns = settings.enrichments?.table.columns.map(column => {
      return new TableColumn({
        context: this.context,
        label: column.label,
        formatter: column.formatter,
        accessorPath: column.accessorPath,
        objectName: tableRowSchema.toRefName(),
        destinationPath: settings.exportPath
      })
    })

    this.columns = List.toArray(columns ?? [])

    this.register({
      imports: {
        '@/components/data-table/data-table-column-header': ['DataTableColumnHeader']
      }
    })
  }

  static override toIdentifier(_operation: OasOperation) {
    return Identifier.createVariable(`columns`)
  }

  override toString(): string {
    return this.columns.toString()
  }
}
