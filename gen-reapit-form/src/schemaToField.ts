import type { CustomValue, GenerateContextType, OasRef, OasSchema, Stringable } from '@skmtc/core'
import { StringInput } from './fields/StringInput.ts'
import { NumberInput } from './fields/NumberInput.ts'
import { CheckboxInput } from './fields/CheckboxInput.ts'
import { SelectInput } from './fields/SelectInput.ts'
import { TextAreaInput } from './fields/TextAreaInput.ts'

export type SchemaToFieldArgs = {
  context: GenerateContextType
  /** Dotted lens path, e.g. `input.title`. */
  path: string
  label: string | undefined
  isRequired: boolean
  schema: OasSchema | OasRef<'schema'> | CustomValue
  destinationPath: string
}

/**
 * Map a single OAS schema (typically derived from a GraphQL argument or
 * input field) onto a Reapit-elements form field.
 *
 * - `boolean` → `<Checkbox>`
 * - `integer` / `number` → `<Input type="number">`
 * - `string` with enums → `<SelectNative>`
 * - `string` with `format: 'multiline'` → `<TextArea>`
 * - `string` (default) → `<Input type="text">`
 * - `object` / `array` → flattened recursively (object) or treated as a
 *   string for v1 (array — TODO: dedicated repeatable section).
 *
 * Refs are resolved before dispatch so we always switch on a concrete
 * type. The single-member-intersection edge case (used by SKMTC to attach
 * extension fields to refs) is unwrapped first.
 */
export const schemaToField = (args: SchemaToFieldArgs): Stringable => {
  const { schema, context, path, label, isRequired, destinationPath } = args

  // CustomValue is opaque — we don't know its TS type, so render a string
  // input as a safe default. This rarely fires in practice for GraphQL.
  if (schema.type === 'custom') {
    return new StringInput({ context, path, label, isRequired, destinationPath })
  }

  if ('members' in schema && Array.isArray(schema.members) && schema.members.length === 1) {
    return schemaToField({ ...args, schema: schema.members[0] })
  }

  if (schema.isRef()) {
    return schemaToField({ ...args, schema: schema.resolve() })
  }

  if (schema.type === 'object' && schema.properties) {
    // Flatten nested object: emit a field per leaf property using
    // `path.<propertyName>` so the lens / RHF name composes naturally.
    const required = schema.required ?? []
    const lines = Object.entries(schema.properties).map(([propName, propSchema]) =>
      schemaToField({
        context,
        path: `${path}.${propName}`,
        label: getLabel({ schema: propSchema, name: propName }),
        isRequired: required.includes(propName),
        schema: propSchema,
        destinationPath
      }).toString()
    )
    return lines.join('\n')
  }

  if (schema.type === 'boolean') {
    return new CheckboxInput({ context, path, label, destinationPath })
  }

  if (schema.type === 'integer' || schema.type === 'number') {
    return new NumberInput({ context, path, label, isRequired, destinationPath })
  }

  if (schema.type === 'string') {
    const rawEnums = schema.enums ?? []
    const enumValues: string[] = []
    for (const value of rawEnums) {
      if (typeof value === 'string') enumValues.push(value)
    }
    if (enumValues.length > 0) {
      return new SelectInput({ context, path, label, isRequired, destinationPath, enums: enumValues })
    }
    if (schema.format === 'multiline') {
      return new TextAreaInput({ context, path, label, isRequired, destinationPath })
    }
    return new StringInput({ context, path, label, isRequired, destinationPath })
  }

  // Arrays + unknowns fall back to a string field for v1 — visible to the
  // consumer so they know to enrich the schema if they want a richer UI.
  return new StringInput({ context, path, label, isRequired, destinationPath })
}

type GetLabelArgs = {
  schema: OasSchema | OasRef<'schema'> | CustomValue
  name: string
}

/**
 * Prefer an `x-label` extension if present, otherwise fall back to the
 * property name humanised lightly (just title-cased the first letter).
 */
export const getLabel = ({ schema, name }: GetLabelArgs): string => {
  if (schema.type !== 'custom') {
    const ext = schema.isRef()
      ? schema.resolve().extensionFields?.['x-label']
      : schema.extensionFields?.['x-label']
    if (typeof ext === 'string') return ext
  }
  return name.charAt(0).toUpperCase() + name.slice(1)
}
