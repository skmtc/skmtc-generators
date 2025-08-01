import { ContentBase, List } from '@skmtc/core'
import type { FieldSchema } from './enrichments.ts'
import type { GenerateContext, ListArray } from '@skmtc/core'
import type { Stringable } from '@skmtc/core'

type EnumsFieldProps = {
  context: GenerateContext
  field: FieldSchema
  enums: unknown[]
  destinationPath: string
}

export class EnumsField extends ContentBase {
  field: FieldSchema
  accessorPath: string
  options: ListArray<Stringable> | undefined
  constructor({ context, field, enums, destinationPath }: EnumsFieldProps) {
    super({ context })

    this.field = field
    this.accessorPath = field.accessorPath.join('.')

    this.options = List.toArray(enums.map((item) => JSON.stringify({ label: item, value: item })))

    this.register({
      imports: {
        [this.field.input.exportPath]: [this.field.input.exportName]
      },
      destinationPath
    })
  }

  override toString(): string {
    return `<${this.field.input.exportName}
        ${this.accessorPath ? `lens={lens.focus('${this.accessorPath}')}` : 'lens={lens}'}
        ${this.field.label ? `label="${this.field.label}"` : ''}
        ${this.field.placeholder ? `placeholder="${this.field.placeholder}"` : ''}
        options={${this.options}}
      />`
  }
}
