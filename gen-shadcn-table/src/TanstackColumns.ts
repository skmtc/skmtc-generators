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

    const rowSchema = toListItem({ operation })

    invariant(rowSchema.resolve().type === 'object', 'Expected object type')

    const fallbackName = `${settings.identifier.name}RowType`

    this.createAndRegisterCannonical({
      schema: rowSchema,
      fallbackIdentifier: Identifier.createType(fallbackName),
      schemaToValueFn: toTsValue
    })

    const columns = settings.enrichments?.table?.columns?.map(column => {
      return new TableColumn({
        context: this.context,
        label: column.label,
        formatter: column.formatter,
        accessorPath: column.accessorPath,
        objectName: rowSchema.isRef() ? rowSchema.toRefName() : fallbackName,
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
