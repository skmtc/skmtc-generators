import type { GenerateContext, ListObject, Stringable, ModuleExport } from '@skmtc/core'
import { CustomValue, Definition, Identifier, List, ContentBase } from '@skmtc/core'
import { Column } from './Column.ts'
type ConstructorArgs = {
  context: GenerateContext
  formatter: ModuleExport
  destinationPath: string
  accessorPath: string[]
  label: string | undefined
  objectName: string
}

export class TableColumn extends ContentBase {
  label: string | undefined
  name: string
  properties: ListObject<Stringable>
  constructor({
    context,
    destinationPath,
    accessorPath,
    label,
    objectName,
    formatter
  }: ConstructorArgs) {
    super({ context })

    this.label = label
    this.name = accessorPath.map(path => `${path}`).join('.')

    const columHelper = new CustomValue({
      context: this.context,
      value: `createColumnHelper<${objectName}>()`
    })

    const columnHelperDefinition = new Definition({
      context: this.context,
      identifier: Identifier.createVariable('columnHelper'),
      value: columHelper,
      noExport: true
    })

    this.register({
      imports: {
        '@tanstack/react-table': ['createColumnHelper']
      },
      definitions: [columnHelperDefinition],
      destinationPath
    })

    this.properties = List.toFilteredRecord({
      header: getLabel({ label: this.label, name: accessorPath[accessorPath.length - 1] }),
      cell: getCell({ context, formatter, destinationPath })
    })
  }

  override toString(): string {
    return `columnHelper.accessor('${this.name}', ${this.properties})`
  }
}

type GetLabelArgs = {
  label: string | undefined
  name: string
}

const getLabel = ({ label, name }: GetLabelArgs) => {
  if (typeof label === 'string') {
    return `({ column }) => <DataTableColumnHeader column={column} title="${label}" />`
  }

  return `'${name}'`
}

type GetCellArgs = {
  context: GenerateContext
  formatter: ModuleExport
  destinationPath: string
}

const getCell = ({ context, formatter, destinationPath }: GetCellArgs) => {
  return `({cell}) => ${new Column({ context, formatter, destinationPath })}`
}
