import { List, type ListArray } from '@skmtc/lang-typescript'
import { capitalize } from '@skmtc/core'
import { TsProjection } from '@skmtc/gen-typescript'
import invariant from 'tiny-invariant'
import { TableColumn } from './TableColumn.ts'
import type { OasOperationProjectionConstructorArgs, ToOasOperationIdentifierNameArgs } from '@skmtc/core'
import { toListKeyAndItem } from '@skmtc/gen-tanstack-query-supabase-zod'
import { ShadcnTableBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'

export class TanstackColumns extends ShadcnTableBase {
  columns: ListArray<TableColumn>
  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const { schema } = toListKeyAndItem(operation)

    invariant(schema.resolve().type === 'object', 'Expected object type')

    const rowTypeDefinition = this.insertNormalizedModel(TsProjection, {
      schema,
      fallbackName: capitalize(
        `${ShadcnTableBase.toIdentifierName({ operation, enrichments: settings.enrichments, variant: settings.variant })}RowType`
      )
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

  static override toIdentifierName(_args: ToOasOperationIdentifierNameArgs<EnrichmentSchema>): string {
    return 'columns'
  }

  override toString(): string {
    return this.columns.toString()
  }
}
