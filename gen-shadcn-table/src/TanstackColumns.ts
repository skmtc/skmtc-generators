import { List, Identifier, capitalize } from '@skmtc/core'
import { TsInsertable } from '@skmtc/gen-typescript'
import invariant from 'tiny-invariant'
import { TableColumn } from './TableColumn.ts'
import type { ListArray, OasOperation, OperationInsertableArgs } from '@skmtc/core'
import { toListKeyAndItem } from '@skmtc/gen-tanstack-query-zod'
import { ShadcnTableBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'

export class TanstackColumns extends ShadcnTableBase {
  columns: ListArray<TableColumn>
  constructor({ context, operation, settings }: OperationInsertableArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const { schema } = toListKeyAndItem(operation)

    invariant(schema.resolve().type === 'object', 'Expected object type')

    const rowTypeDefinition = this.insertNormalizedModel(TsInsertable, {
      schema,
      fallbackName: capitalize(`${ShadcnTableBase.toIdentifier(operation).name}RowType`)
    })

    const columns = settings.enrichments?.table?.columns?.map(column => {
      return new TableColumn({
        context: this.context,
        label: column.label,
        formatter: column.formatter,
        accessorPath: column.accessorPath,
        objectName: rowTypeDefinition.identifier.name,
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
