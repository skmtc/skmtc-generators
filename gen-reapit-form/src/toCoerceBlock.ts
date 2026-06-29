import type { CustomValue, OasObject, OasRef, OasSchema } from '@skmtc/core'

/**
 * Synthesize a JS object-literal expression that maps form values
 * (RHF-stored) to the GraphQL submit shape.
 *
 * The form's field components are typed against non-null lenses via
 * `defined()`, so `values` here is the form's internal type — but
 * RHF/Zod can store `""` (empty input) and `undefined` (untouched
 * field) regardless. This block converts those to the
 * GraphQL-expected `null`/`undefined` for nullable/optional fields,
 * and leaves required fields as identity reads.
 *
 * Conventions:
 *   - required string  →   `accessor`
 *   - optional string  →   `accessor || null`     (empty → null)
 *   - required number  →   `accessor`
 *   - optional number  →   `accessor ?? null`
 *   - boolean (any)    →   `accessor ?? false`    (least-surprise UX)
 *   - object           →   recurse, optional wrapped in ternary
 *   - array            →   `accessor` (no per-element coercion in v1)
 *   - ref              →   resolve, then re-enter the switch
 */
export const toCoerceBlock = (args: OasObject): string => {
  return toObjectExpr('values', args)
}

const toObjectExpr = (accessor: string, schema: OasObject): string => {
  const required = schema.required ?? []
  const lines = Object.entries(schema.properties ?? {}).map(([key, prop]) => {
    const value = toCoerceValue(`${accessor}.${key}`, prop, required.includes(key))
    return `  ${key}: ${value}`
  })
  return `{\n${lines.join(',\n')}\n}`
}

const toCoerceValue = (
  accessor: string,
  schema: OasSchema | OasRef<'schema'> | CustomValue,
  isRequired: boolean
): string => {
  // CustomValue: opaque pass-through.
  if (schema.type === 'custom') return accessor

  // Single-member intersection (SKMTC's ref-with-extension carrier).
  if ('members' in schema && Array.isArray(schema.members) && schema.members.length === 1) {
    return toCoerceValue(accessor, schema.members[0], isRequired)
  }

  if (schema.isRef()) {
    return toCoerceValue(accessor, schema.resolve(), isRequired)
  }

  if (schema.type === 'object' && schema.properties) {
    const inner = toObjectExpr(accessor, schema)
    return isRequired ? inner : `${accessor} ? ${inner} : null`
  }

  if (schema.type === 'boolean') {
    // Least-surprise: untouched checkbox is `false` regardless of
    // schema nullability.
    return `${accessor} ?? false`
  }

  if (schema.type === 'integer' || schema.type === 'number') {
    return isRequired ? accessor : `${accessor} ?? null`
  }

  if (schema.type === 'string') {
    if (schema.format === 'JSON') {
      // Custom scalar `JSON` is a string in OAS land but the gateway
      // expects an actual JSON value. Parse on submit; empty → null
      // (always, regardless of nullability — sending the literal string
      // "" would round-trip as a JSON parse error). Malformed JSON will
      // throw in `handleSubmit`, which RHF surfaces as a submit error.
      return `${accessor} ? JSON.parse(${accessor}) : null`
    }
    // RHF stores `""` after the user clears a text input. For optional
    // strings we want that to become `null` in the submit shape; for
    // required strings, leave it (Zod validation should reject empties
    // if the API requires non-empty — that's a `gen-zod` concern).
    return isRequired ? accessor : `${accessor} || null`
  }

  if (schema.type === 'array') {
    // ArrayStringField stores `string[]` once the user types, but RHF's
    // controller hands us `undefined` while the field is untouched. The
    // GraphQL API rejects `undefined` for `[String!]!` (required) and
    // for nullable arrays we still prefer `[]` over `null` to keep the
    // submit shape uniform — the gateway treats them identically.
    return `${accessor} ?? []`
  }

  // Unknown — pass through.
  return accessor
}
