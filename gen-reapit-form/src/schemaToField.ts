import type { CustomValue, GenerateContextType, OasRef, OasSchema, Stringable } from '@skmtc/core'
import type { FormFieldItem } from './enrichments.ts'
import { StringInput, type StringInputType } from './fields/StringInput.ts'
import { NumberInput } from './fields/NumberInput.ts'
import { CheckboxInput } from './fields/CheckboxInput.ts'
import { SelectInput } from './fields/SelectInput.ts'
import { TextAreaInput } from './fields/TextAreaInput.ts'
import { ArrayInput } from './fields/ArrayInput.ts'
import { LookupInput } from './fields/LookupInput.ts'
import { InputWrapper } from './fields/InputWrapper.ts'
import { SectionInput } from './fields/SectionInput.ts'
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
  /** Dotted lens path, e.g. `primaryAddress.type`. Used both as the
   *  RHF field name and as the lookup key into `overrides`. */
  path: string
  isRequired: boolean
  schema: OasSchema | OasRef<'schema'> | CustomValue
  destinationPath: string
  /**
   * Per-field enrichment overrides, keyed by dotted accessor path.
   * Lookups happen at every level of the recursion, so an override at
   * `primaryAddress.type` applies to that nested field while leaving
   * sibling addresses' `type` fields with the default humanised label.
   *
   * Override fields (`label`, `references`, `referenceKind`,
   * `placeholder`) all read from the canonical `formFieldItem` schema
   * in core. The Reapit GraphQL schema is third-party so we don't
   * expect schema-level extensions — enrichment is the only knob.
   */
  overrides: ReadonlyMap<string, FormFieldItem>
}

/**
 * Map a single OAS schema (typically derived from a GraphQL argument or
 * input field) onto a Reapit-elements form field.
 *
 * Dispatch order:
 *  1. If the override at this path declares `references` and a
 *     producer generator claims the referenced operation, emit a
 *     lookup component via `context.insertOperation` (operation-
 *     reference protocol). This takes precedence over default arms.
 *  2. Single-member-intersection edge case (used by SKMTC to attach
 *     extension fields to refs) is unwrapped first so we don't switch
 *     on `members`.
 *  3. Refs are resolved before dispatch so we always switch on a concrete
 *     type.
 *  4. Type-based arms: object → flatten under a Subtitle, array →
 *     comma-list, scalar → field.
 */
export const schemaToField = (args: SchemaToFieldArgs): Stringable => {
  const { schema, context, path, isRequired, destinationPath, overrides } = args

  const override = overrides.get(path)
  const label = override?.label ?? humaniseLast(path)

  // Wrap a leaf field in `<InputWrap>` so it slots into the form grid.
  // Only used for non-section results — SectionInput handles its own
  // grid wrapping internally (Subtitle in `<InputWrapFull>`).
  const wrap = (child: Stringable): Stringable =>
    new InputWrapper({ context, child, destinationPath })

  // 1. Reference-backed dispatch. Fires whenever the override at this
  //    path carries a `references` field — works at any nesting level,
  //    not just top-level, since overrides are looked up by full path.
  if (override?.references && context.document.type === 'gql') {
    const kind: ReferenceKind = isReferenceKind(override.referenceKind)
      ? override.referenceKind
      : 'searchable'
    const Projection = KIND_TO_PROJECTION[kind]
    const queryOp = context.document.value.operations.find(
      op =>
        op.rootKind === 'query' &&
        op.fieldName === override.references &&
        Projection.isSupported({ context, operation: op })
    )
    if (queryOp) {
      const inserted = context.insertOperation({
        projection: Projection,
        operation: queryOp,
        destinationPath
      })
      return wrap(new LookupInput({
        context,
        componentName: inserted.toName(),
        path,
        label,
        isRequired
      }))
    }
    // Reference set but no producer claims the operation — fall through
    // to the default field. (If this becomes a footgun, we can throw
    // here and require explicit removal of stale references.)
  }

  // CustomValue is opaque — we don't know its TS type, so render a string
  // input as a safe default. This rarely fires in practice for GraphQL.
  if (schema.type === 'custom') {
    return wrap(new StringInput({ context, path, label, isRequired, destinationPath }))
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
    // Each child does its own override lookup by its own path. Children
    // are already InputWrap-wrapped via their own `wrap()` call here.
    const required = schema.required ?? []
    const children = Object.entries(schema.properties).map(([propName, propSchema]) =>
      schemaToField({
        context,
        path: `${path}.${propName}`,
        isRequired: required.includes(propName),
        schema: propSchema,
        destinationPath,
        overrides
      })
    )

    // SectionInput owns its own grid wrapping (Subtitle in InputWrapFull).
    return new SectionInput({ context, label, children, destinationPath })
  }

  if (schema.type === 'boolean') {
    return wrap(new CheckboxInput({ context, path, label, destinationPath }))
  }

  if (schema.type === 'integer' || schema.type === 'number') {
    return wrap(new NumberInput({ context, path, label, isRequired, destinationPath }))
  }

  if (schema.type === 'string') {
    const rawEnums = schema.enums ?? []
    const enumValues: string[] = []
    for (const value of rawEnums) {
      if (typeof value === 'string') enumValues.push(value)
    }
    if (enumValues.length > 0) {
      return wrap(new SelectInput({ context, path, label, isRequired, destinationPath, enums: enumValues }))
    }
    if (schema.format === 'multiline' || schema.format === 'JSON') {
      // GraphQL custom scalars (including `JSON`) arrive as strings with
      // `format: <ScalarName>` (see core/parsers/graphql/toScalarType).
      // JSON-bearing fields want multi-line UX; the form's coerce step
      // re-parses the string before submit (see toCoerceBlock).
      return wrap(new TextAreaInput({ context, path, label, isRequired, destinationPath }))
    }
    return wrap(new StringInput({
      context,
      path,
      label,
      isRequired,
      destinationPath,
      inputType: inferStringInputType(path, schema.format)
    }))
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
        return wrap(new ArrayInput({ context, path, label, isRequired, destinationPath }))
      }
    }
    return wrap(new StringInput({ context, path, label, isRequired, destinationPath }))
  }

  // Unknown scalars (e.g. GraphQL custom scalars like JSON) fall back to a
  // string field so the consumer notices and decides how to enrich.
  return wrap(new StringInput({ context, path, label, isRequired, destinationPath }))
}

const isReferenceKind = (value: string | undefined): value is ReferenceKind =>
  value === 'searchable' || value === 'multiselect'

/**
 * Map a string field's path + schema format onto an HTML `type` value
 * for richer mobile keyboards and browser-native validation. Convention
 * over configuration: field names ending in "Email" / "Phone" / "Date"
 * (or with format `date` / `date-time`) get the appropriate type.
 *
 * Future: add an explicit `inputType` field to the canonical
 * `formFieldItem` enrichment so consumers can override per-field
 * (e.g. a "Url" string that this heuristic doesn't recognise).
 */
const inferStringInputType = (
  path: string,
  format: string | undefined
): StringInputType => {
  if (format === 'date' || format === 'date-time') return 'date'
  const last = (path.split('.').pop() ?? path).toLowerCase()
  if (last.endsWith('email')) return 'email'
  if (last.endsWith('phone') || last.endsWith('tel') || last.endsWith('mobile')) return 'tel'
  if (last.endsWith('date') || last.endsWith('birth') || last === 'dateofbirth') return 'date'
  return 'text'
}

/**
 * Humanise the last segment of a dotted accessor path. Leading
 * underscores stripped, camelCase boundaries split into words, first
 * letter title-cased.
 *   - `dateOfBirth` → "Date Of Birth"
 *   - `homePhone` → "Home Phone"
 *   - `primaryAddress.buildingNumber` → "Building Number"
 *   - `_eTag` → "E Tag" (framework field; not user-facing anyway)
 *
 * Acronyms are preserved as runs of uppercase letters with a break
 * before the trailing word: `XMLHttpRequest` → "XML Http Request".
 */
const humaniseLast = (path: string): string => {
  const last = path.split('.').pop() ?? path
  const stripped = last.replace(/^_+/, '')
  if (!stripped) return last
  return stripped
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase())
}
