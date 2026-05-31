import type {
  CustomValue,
  GenerateContextType,
  OasObject,
  OasRef,
  OasSchema,
  Stringable
} from '@skmtc/core'
import { StringInput } from './fields/StringInput.ts'
import { NumberInput } from './fields/NumberInput.ts'
import { IntegerInput } from './fields/IntegerInput.ts'
import { CheckboxInput } from './fields/CheckboxInput.ts'
import { SelectInput } from './fields/SelectInput.ts'
import { ObjectInput } from './fields/ObjectInput.ts'

type SchemaToFieldArgs = {
  name: string
  label: string | undefined
  skipLabel?: boolean
  isRequired: boolean
  schema: OasRef<'schema'> | OasSchema | CustomValue
  context: GenerateContextType
  destinationPath: string
  topLevelSchema: OasSchema | OasRef<'schema'>
}

export const schemaToField = (args: SchemaToFieldArgs): Stringable => {
  const { schema, context, destinationPath, name, label, skipLabel, isRequired, topLevelSchema } =
    args

  // Single-member intersection workaround for ref-with-extension
  if ('members' in schema && schema.members.length === 1) {
    return schemaToField({
      ...args,
      schema: schema.members[0],
      label: getLabel({ schema, name })
    })
  }

  // Resolve refs before dispatching on type
  if (schema.isRef()) {
    return schemaToField({
      ...args,
      schema: schema.resolve(),
      label: label ?? getLabel({ schema, name })
    })
  }

  if (schema.type === 'object') {
    return new ObjectInput({
      context,
      schema: schema as OasObject,
      name,
      label: label ?? getLabel({ schema, name }),
      destinationPath,
      isRequired,
      topLevelSchema
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
      const enums: string[] = schema.enums.flatMap(v =>
        typeof v === 'string' ? [v] : []
      )
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

    const isMultiline = schema.format === 'textarea' || (schema.maxLength ?? 0) > 200
    return new StringInput({
      context,
      name,
      label: label ?? getLabel({ schema, name }),
      destinationPath,
      skipLabel,
      multiline: isMultiline,
      schema
    })
  }

  // Fallback: treat unknown types as a plain text input. `schema` may be a
  // CustomValue here (no schema-document location) — pass it only when real.
  return new StringInput({
    context,
    name,
    label: label ?? getLabel({ schema, name }),
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
  if (schema.type === 'custom') return name

  const label = schema.isRef()
    ? schema.resolve().extensionFields?.['x-label']
    : schema.extensionFields?.['x-label']

  return typeof label === 'string' ? label : undefined
}
