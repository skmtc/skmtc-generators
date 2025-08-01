import { ContentBase, List } from '@skmtc/core'
import type { FieldSchema } from './enrichments.ts'
import type { GenerateContext, OasSchema, OasRef, ListArray } from '@skmtc/core'
import type { Stringable } from '@skmtc/core'

type InputFieldProps = {
  context: GenerateContext
  field: FieldSchema
  schema: OasSchema | OasRef<'schema'> | undefined
  destinationPath: string
}

export class InputField extends ContentBase {
  field: FieldSchema
  accessorPath: string
  schema: OasSchema | OasRef<'schema'> | undefined
  enums: ListArray<Stringable> | undefined
  constructor({ context, field, schema, destinationPath }: InputFieldProps) {
    super({ context })

    this.field = field
    this.accessorPath = field.accessorPath.join('.')

    const resolved = schema?.resolve()

    this.enums =
      resolved && 'enums' in resolved && resolved.enums
        ? List.toArray(resolved.enums.map((item) => JSON.stringify(item)))
        : undefined

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
      />`
  }
}
