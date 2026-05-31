import { SnippetBase, List } from '@skmtc/core'
import type {
  GenerateContextType,
  ListLines,
  OasObject,
  OasRef,
  OasSchema,
  Stringable
} from '@skmtc/core'
import invariant from 'tiny-invariant'
import { schemaToField, getLabel } from '../schemaToField.ts'

type ObjectInputArgs = {
  context: GenerateContextType
  schema: OasObject
  name: string
  label: string | undefined
  destinationPath: string
  isRequired: boolean
  topLevelSchema: OasSchema | OasRef<'schema'>
}

export class ObjectInput extends SnippetBase {
  name: string
  label: string | undefined
  fields: ListLines<Stringable>

  constructor({
    context,
    name: parentName,
    label,
    schema,
    destinationPath,
    topLevelSchema
  }: ObjectInputArgs) {
    super({ context, schema })

    invariant(schema.type === 'object', 'ObjectInput: expected object schema')

    this.name = parentName
    this.label = label ?? parentName

    this.fields = List.fromEntries(schema.properties ?? {}).toLines(
      ([childName, childSchema]) => {
        return schemaToField({
          context,
          name: `${parentName}.${childName}`,
          schema: childSchema,
          destinationPath,
          skipLabel: false,
          label: getLabel({ schema: childSchema, name: childName }) ?? childName,
          isRequired: Boolean(schema.required?.includes(childName)),
          topLevelSchema
        })
      }
    )
  }

  override toString() {
    return `<fieldset className="border border-base-300 rounded-box p-4 w-full">
  <legend className="px-2 text-sm font-medium">${this.label}</legend>
  <div className="flex flex-col gap-3">
    ${this.fields}
  </div>
</fieldset>`
  }
}
