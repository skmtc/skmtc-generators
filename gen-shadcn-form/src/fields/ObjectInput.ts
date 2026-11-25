import type { OasSchema, Stringable, OasRef, GenerateContextType } from '@skmtc/core'
import { TsSnippet, List, type ListLines } from '@skmtc/lang-typescript'
import { schemaToField, getLabel } from '../schemaToField.ts'
import type { OpenModels } from '../openModels.ts'
import invariant from 'tiny-invariant'
import { FormLabel } from '../FormLabel.ts'

type ObjectInputArgs = {
  schema: OasSchema
  context: GenerateContextType
  name: string
  label: string | undefined
  destinationPath: string
  isRequired: boolean
  topLevelSchema: OasSchema | OasRef<'schema'>
  openModels: OpenModels
}

export class ObjectInput extends TsSnippet {
  name: string
  label: FormLabel
  placeholder?: string
  fields: ListLines<Stringable>

  constructor({
    context,
    name: parentName,
    label,
    destinationPath,
    schema: schema,
    topLevelSchema,
    openModels
  }: ObjectInputArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    invariant(schema.type === 'object', 'ObjectInput: Expected object schema')

    this.name = parentName

    this.label = new FormLabel({ context, label: label ?? name, destinationPath })

    this.fields = List.fromEntries(schema.properties ?? {}).toLines(([name, propertySchema]) => {
      return schemaToField({
        context,
        name: `${parentName}.${name}`,
        schema: propertySchema,
        destinationPath,
        skipLabel: false,
        label: getLabel({ schema: propertySchema, name }),
        isRequired: Boolean(schema.required?.includes(name)),
        topLevelSchema,
        openModels
      })
    })
  }

  override toString() {
    return `${this.label}
  ${this.fields}
`
  }
}
