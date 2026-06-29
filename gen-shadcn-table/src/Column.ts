import type { GenerateContextType, ModuleExport } from '@skmtc/core'
import { TsSnippet } from '@skmtc/lang-typescript'

type TableColumnProps = {
  context: GenerateContextType
  formatter: ModuleExport
  destinationPath: string
}

export class Column extends TsSnippet {
  formatter: ModuleExport
  constructor({ context, formatter, destinationPath }: TableColumnProps) {
    super({ context })

    this.formatter = formatter

    this.register({
      imports: {
        [formatter.exportPath]: [formatter.exportName]
      },
      destinationPath
    })
    // TODO: Create helper function to safely serialize the accessor path
  }

  override toString(): string {
    return `<${this.formatter.exportName}
      value={cell.getValue()}
    />`
  }
}
