import type {
  CustomValue,
  GenerateContextType,
  ModuleExport,
  OasRef,
  OasSchema,
  Stringable
} from '@skmtc/core'
import { StringInput } from './fields/StringInput.ts'
import { CustomInput } from './fields/CustomInput.ts'
import { Table } from './fields/Table.ts'
import { ObjectInput } from './fields/ObjectInput.ts'
import { SelectInput } from './fields/SelectInput.ts'
import { NumberInput } from './fields/NumberInput.ts'
import { IntegerInput } from './fields/IntegerInput.ts'
import { CheckboxInput } from './fields/CheckboxInput.ts'
import { openModel, repeatsModel, type OpenModels } from './openModels.ts'

type SchemaToFieldArgs = {
  name: string
  label: string | undefined
  skipLabel?: boolean
  isRequired: boolean
  schema: OasRef<'schema'> | OasSchema | CustomValue
  context: GenerateContextType
  destinationPath: string
  topLevelSchema: OasSchema | OasRef<'schema'>
  openModels: OpenModels
  /** Consumer-assigned input component for this field (the `input` enrichment).
   *  When present it wins over schema-type routing — the field renders the named
   *  component, type-matched in the hub to accept the field's `lens`. */
  input?: ModuleExport
}

export const schemaToField = ({
  isRequired,
  schema,
  context,
  destinationPath,
  name,
  label,
  skipLabel,
  topLevelSchema,
  openModels,
  input
}: SchemaToFieldArgs): Stringable | undefined => {
  // A consumer-assigned input component overrides schema-type routing entirely:
  // render it directly (only `lens` is emitted — the prop the hub matcher
  // verified). Checked first so it applies regardless of the field's shape.
  if (input) {
    return new CustomInput({
      context,
      name,
      destinationPath,
      input,
      schema: schema.type === 'custom' ? undefined : schema
    })
  }

  // A model inside itself has no end, and no default field would work for it
  // (#122). After `input`, which is how a consumer gives a top-level field for it.
  if (repeatsModel({ schema, openModels })) {
    return undefined
  }

  // OpenAPI refs cannot have extensions and as a workaround
  // it represents them as a single member intersection.
  // To handle this edge case we call adjust the arguments
  // by taking the schema from the intersection member and label
  // from the intersection itself. Then we call schemaToField
  // recursively with the adjusted arguments.
  if ('members' in schema && schema.members.length === 1) {
    return schemaToField({
      schema: schema.members[0],
      isRequired,
      context,
      destinationPath,
      name,
      skipLabel,
      label: getLabel({ schema, name }),
      topLevelSchema,
      openModels
    })
  }

  // If schema is a reference
  if (schema.isRef()) {
    // we look up its value and call schemaToField recursively
    // to handle the resolved schema

    return schemaToField({
      schema: schema.resolve(),
      isRequired,
      context,
      destinationPath,
      name,
      skipLabel,
      label: label ?? getLabel({ schema, name }),
      topLevelSchema,
      openModels: openModel({ schema, openModels })
    })
  }

  if (schema.type === 'object') {
    return new ObjectInput({
      context,
      schema: schema,
      name,
      label: label ?? getLabel({ schema, name }),
      destinationPath,
      isRequired,
      topLevelSchema,
      openModels
    })
  }

  if (schema.type === 'array') {
    return new Table({
      context,
      schema: schema.items,
      name,
      label: label ?? getLabel({ schema, name }),
      destinationPath,
      isRequired,
      topLevelSchema,
      openModels
    })
  }

  if (schema.type === 'number') {
    return new NumberInput({
      context,
      name,
      label: label ?? getLabel({ schema, name }),
      destinationPath,
      skipLabel,
      schema
    })
  }

  if (schema.type === 'integer') {
    return new IntegerInput({
      context,
      name,
      label: label ?? getLabel({ schema, name }),
      destinationPath,
      skipLabel,
      schema
    })
  }

  if (schema.type === 'boolean') {
    return new CheckboxInput({
      context,
      name,
      label: label ?? getLabel({ schema, name }),
      destinationPath,
      skipLabel,
      schema
    })
  }

  if (schema.type === 'string') {
    if (schema.enums?.length) {
      const enums = schema.enums.flatMap(item => (typeof item === 'string' ? [item] : []))

      return new SelectInput({
        context,
        name,
        label: label ?? getLabel({ schema, name }),
        destinationPath,
        skipLabel,
        enums,
        schema
      })
    }
  }

  // `schema` may still be a CustomValue here (type 'custom'), which has no
  // schema-document location — pass it only when it's a real schema node.
  return new StringInput({
    context,
    name,
    label,
    destinationPath,
    skipLabel,
    schema: schema.type === 'custom' ? undefined : schema
  })
}

type GetLabelArgs = {
  schema: OasRef<'schema'> | OasSchema | CustomValue
  name: string
}

export const getLabel = ({ schema, name }: GetLabelArgs): string | undefined => {
  if (schema.type === 'custom') {
    return name
  }

  const label = schema.isRef()
    ? schema.resolve().extensionFields?.['x-label']
    : schema.extensionFields?.['x-label']
  return typeof label === 'string' ? label : undefined
}
