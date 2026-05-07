import type { CustomValue, GenerateContextType, OasRef, OasSchema, Stringable } from '@skmtc/core'
import { StringInput } from './fields/StringInput.ts'
import { NumberInput } from './fields/NumberInput.ts'
import { CheckboxInput } from './fields/CheckboxInput.ts'
import { SelectInput } from './fields/SelectInput.ts'
import { TextAreaInput } from './fields/TextAreaInput.ts'
import { ArrayInput } from './fields/ArrayInput.ts'
import { LookupInput } from './fields/LookupInput.ts'
import { ReapitSearchableDropdown } from '@skmtc/gen-reapit-searchable-dropdown'
import { ReapitMultiSelect } from '@skmtc/gen-reapit-multi-select'

// Maps the canonical `formFieldItem.referenceKind` discriminator onto
// the producer generator's Projection class. The form picks one of
// these per referenced field; idempotency on `(toIdentifier,
// toExportPath)` ensures multiple consumers of the same operation
// share a single emitted component file.
const KIND_TO_PROJECTION = {
  searchable: ReapitSearchableDropdown,
  multiselect: ReapitMultiSelect
} as const

type ReferenceKind = keyof typeof KIND_TO_PROJECTION

export type SchemaToFieldArgs = {
  context: GenerateContextType
  /** Dotted lens path, e.g. `input.title`. */
  path: string
  label: string | undefined
  isRequired: boolean
  schema: OasSchema | OasRef<'schema'> | CustomValue
  destinationPath: string
  /**
   * GraphQL Query field name backing this argument, taken from the form's
   * `fields[].references` enrichment. When set and a producer generator
   * claims the operation, the form dispatches the producer's component
   * instead of the default per-type field. Plumbed only on the top-level
   * call — recursive descent into objects clears it (a nested property
   * isn't the referenced field).
   */
  references?: string
  /**
   * Variant selector for the dispatch — `'searchable'` (default) for
   * unbounded entity sets, `'multiselect'` for bounded sets that can
   * be loaded in full upfront. Maps to a different producer generator
   * class.
   */
  referenceKind?: string
}

/**
 * Map a single OAS schema (typically derived from a GraphQL argument or
 * input field) onto a Reapit-elements form field.
 *
 * Dispatch order:
 *  1. If `references` is set and resolves to a supported Query operation,
 *     emit a lookup component via `context.insertOperation` (operation-
 *     reference protocol). This takes precedence over default arms.
 *  2. Single-member-intersection edge case (used by SKMTC to attach
 *     extension fields to refs) is unwrapped first so we don't switch
 *     on `members`.
 *  3. Refs are resolved before dispatch so we always switch on a concrete
 *     type.
 *  4. Type-based arms: object → flatten, array → comma-list, scalar → field.
 */
export const schemaToField = (args: SchemaToFieldArgs): Stringable => {
  const { schema, context, path, label, isRequired, destinationPath, references, referenceKind } = args

  // 1. Reference-backed dispatch. Only meaningful at top-level (the form's
  //    direct argument) — recursive `schemaToField` calls below drop it.
  if (references) {
    const kind: ReferenceKind = isReferenceKind(referenceKind) ? referenceKind : 'searchable'
    const Projection = KIND_TO_PROJECTION[kind]
    const queryOp = context.gqlDocument.operations.find(
      op =>
        op.rootKind === 'query' &&
        op.fieldName === references &&
        Projection.isSupported({ context, operation: op })
    )
    if (queryOp) {
      const inserted = context.insertOperation({
        projection: Projection,
        operation: queryOp,
        destinationPath
      })
      return new LookupInput({
        context,
        componentName: inserted.toName(),
        path,
        label
      })
    }
    // Reference set but no producer claims the operation — fall through
    // to the default field. (If this becomes a footgun, we can throw
    // here and require explicit removal of stale references.)
  }

  // CustomValue is opaque — we don't know its TS type, so render a string
  // input as a safe default. This rarely fires in practice for GraphQL.
  if (schema.type === 'custom') {
    return new StringInput({ context, path, label, isRequired, destinationPath })
  }

  if ('members' in schema && Array.isArray(schema.members) && schema.members.length === 1) {
    return schemaToField({ ...args, schema: schema.members[0], references: undefined })
  }

  if (schema.isRef()) {
    return schemaToField({ ...args, schema: schema.resolve(), references: undefined })
  }

  if (schema.type === 'object' && schema.properties) {
    // Flatten nested object: emit a field per leaf property using
    // `path.<propertyName>` so the lens / RHF name composes naturally.
    // References don't propagate into nested properties — they're a
    // top-level concern (the field IS the reference).
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
    if (schema.format === 'multiline' || schema.format === 'JSON') {
      // GraphQL custom scalars (including `JSON`) arrive as strings with
      // `format: <ScalarName>` (see core/parsers/graphql/toScalarType).
      // JSON-bearing fields want multi-line UX; the form's coerce step
      // re-parses the string before submit (see toCoerceBlock).
      return new TextAreaInput({ context, path, label, isRequired, destinationPath })
    }
    return new StringInput({ context, path, label, isRequired, destinationPath })
  }

  if (schema.type === 'array') {
    // GraphQL `[String]` and `[String!]!` both arrive here with an `items`
    // schema we can pattern-match on. Strings → comma-separated single-line
    // input. Anything else falls back to a single string field for v1 (the
    // consumer can enrich, or we add `<NumberArrayField>` etc. later).
    const items = schema.items
    if (items) {
      const resolved = items.isRef() ? items.resolve() : items
      if (resolved.type === 'string') {
        return new ArrayInput({ context, path, label, isRequired, destinationPath })
      }
    }
    return new StringInput({ context, path, label, isRequired, destinationPath })
  }

  // Unknown scalars (e.g. GraphQL custom scalars like JSON) fall back to a
  // string field so the consumer notices and decides how to enrich.
  return new StringInput({ context, path, label, isRequired, destinationPath })
}

const isReferenceKind = (value: string | undefined): value is ReferenceKind =>
  value === 'searchable' || value === 'multiselect'

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
