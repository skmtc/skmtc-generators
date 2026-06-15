import { toRefName } from '@skmtc/core'
import { handleKey } from '@skmtc/lang-typescript'
import type { OasSchema, OasRef, CustomValue } from '@skmtc/core'

/** Any schema-shaped value, including the `CustomValue` an object property may hold. */
export type AnySchema = OasSchema | OasRef<'schema'> | CustomValue

/** A parsed object schema — the input for an inline interface body. */
export type ObjectSchema = Extract<OasSchema, { type: 'object' }>

export const schemaDescription = (schema: AnySchema): string | undefined =>
  'description' in schema && typeof schema.description === 'string' ? schema.description : undefined

/**
 * Render a parsed OAS schema as an inline TypeScript type expression — the
 * SDK's co-located form (a `$ref` becomes the referenced name, optionally
 * renamed; an object becomes an inline `{ … }` literal). Deliberately
 * self-contained rather than reusing `@skmtc/gen-typescript`, whose model
 * emits separate files and would pull in a second `@skmtc/lang-typescript`
 * copy.
 */
export const toTsType = (schema: AnySchema, schemaNames: Record<string, string> = {}): string => {
  switch (schema.type) {
    case 'ref': {
      const name = toRefName(schema.$ref)
      return schemaNames[name] ?? name
    }
    case 'string':
      return schema.enums && schema.enums.length > 0
        ? schema.enums.map(value => `'${value}'`).join(' | ')
        : 'string'
    case 'integer':
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'array':
      return `Array<${toTsType(schema.items, schemaNames)}>`
    case 'object':
      return toInterfaceBody(schema, schemaNames)
    case 'union':
      return schema.members.map(member => toTsType(member, schemaNames)).join(' | ')
    case 'custom':
      return `${schema}`
    default:
      return 'unknown'
  }
}

/**
 * Render an object schema's `{ … }` body — each property prefixed by its
 * description as a JSDoc block and suffixed with `?` when not required.
 * Used both for inline object types and for the body of a named
 * `interface`.
 */
export const toInterfaceBody = (schema: ObjectSchema, schemaNames: Record<string, string> = {}): string => {
  const properties = schema.properties ?? {}
  const required = schema.required ?? []

  const members = Object.entries(properties).map(([key, property]) => {
    const optionality = required.includes(key) ? '' : '?'
    const description = schemaDescription(property)
    const jsdoc = description ? `/**\n * ${description}\n */\n` : ''

    return `${jsdoc}${handleKey(key)}${optionality}: ${toTsType(property, schemaNames)};`
  })

  return `{\n${members.join('\n\n')}\n}`
}
