import { ContentBase } from '@skmtc/core'
import type { GenerateContext, ModuleExport } from '@skmtc/core'

type InputOptionProps = {
  context: GenerateContext
  itemName: string
  formatter: ModuleExport | undefined
  accessorPath: string[]
  destinationPath: string
}

export class InputOption extends ContentBase {
  formatter: ModuleExport | undefined
  accessorPath: string
  constructor({ context, itemName, formatter, accessorPath, destinationPath }: InputOptionProps) {
    super({ context })

    this.formatter = formatter
    // TODO: Create helper function to safely serialise the accessor path

    this.accessorPath =
      accessorPath?.length > 0 ? [itemName, ...accessorPath].join('.') : [itemName, 'id'].join('.')

    // if (columnOption) {
    //   this.register({
    //     imports: {
    //       [columnOption.exportPath]: [columnOption.name],
    //     },
    //     destinationPath,
    //   })
    // }
    if (this.formatter) {
      this.register({
        imports: {
          [this.formatter.exportPath]: [this.formatter.exportName]
        },
        destinationPath
      })
    }
  }

  override toString(): string {
    return this.formatter
      ? `<${this.formatter.exportName}
        value={${this.accessorPath}}
      />`
      : `{${this.accessorPath}}`
  }
}
