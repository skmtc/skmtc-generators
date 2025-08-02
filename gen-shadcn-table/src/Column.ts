import { ContentBase } from '@skmtc/core'
import type { GenerateContext, ModuleExport } from '@skmtc/core'

type TableColumnProps = {
  context: GenerateContext
  formatter: ModuleExport
  destinationPath: string
}

export class Column extends ContentBase {
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
    // TODO: Create helper function to safely serialise the accessor path
  }

  override toString(): string {
    return `<${this.formatter.exportName}
      value={cell.getValue()}
    />`
  }
}
