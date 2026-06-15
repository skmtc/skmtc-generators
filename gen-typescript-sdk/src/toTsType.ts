import { toRefName, capitalize, camelCase } from '@skmtc/core'
import { handleKey } from '@skmtc/lang-typescript'
import type { OasSchema, OasRef, CustomValue } from '@skmtc/core'
import { toJsDoc } from './toJsDoc.ts'

/** Any schema-shaped value, including the `CustomValue` an object property may hold. */
export type AnySchema = OasSchema | OasRef<'schema'> | CustomValue

/** A parsed object schema — the input for an inline interface body. */
export type ObjectSchema = Extract<OasSchema, { type: 'object' }>

export const schemaDescription = (schema: AnySchema): string | undefined =>
  'description' in schema && typeof schema.description === 'string' ? schema.description : undefined

/**
 * An *inline* object (named properties, not a `$ref`) — the shape Stainless
 * lifts out of its parent into a `namespace`.
 */
const isExtractableObject = (property: AnySchema): property is ObjectSchema =>
  property.type === 'object' && !!property.properties && Object.keys(property.properties).length > 0

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
 *
 * When `extraction` is supplied (rendering a *named* interface), an inline
 * object property is lifted out: the property type becomes
 * `<owner>.<Child>` and the child is recorded for a `namespace` block. Used
 * without `extraction` for inline object *expressions* (union members, array
 * items), where the body stays inline.
 */
export const toInterfaceBody = (
  schema: ObjectSchema,
  schemaNames: Record<string, string> = {},
  extraction?: { ownerName: string; children: NamedType[] }
): string => {
  const properties = schema.properties ?? {}
  const required = schema.required ?? []

  const members = Object.entries(properties).map(([key, property]) => {
    const optionality = required.includes(key) ? '' : '?'
    const description = schemaDescription(property)
    const jsdoc = description ? `${toJsDoc(description)}\n` : ''

    let type: string
    if (extraction && isExtractableObject(property)) {
      const childName = capitalize(camelCase(key))
      extraction.children.push({ name: childName, schema: property, description })
      type = `${extraction.ownerName}.${childName}`
    } else {
      type = toTsType(property, schemaNames)
    }

    return `${jsdoc}${handleKey(key)}${optionality}: ${type};`
  })

  return `{\n${members.join('\n\n')}\n}`
}

/** A named component schema the resource file declares (interface or type alias). */
export type NamedType = {
  name: string
  /** The resolved (non-ref) schema body. */
  schema: OasSchema
  description: string | undefined
}

/**
 * Walk a root schema and collect every named (`$ref`'d) component reachable
 * from it — transitively through object properties, array items and union
 * members — into `into` (insertion order preserved, deduped by display
 * name). Each `$ref` is resolved to its body; the display name applies
 * `schemaNames` renames. Reserving the map slot before recursing breaks
 * `$ref` cycles.
 */
export const collectNamedTypes = (
  root: AnySchema | undefined,
  schemaNames: Record<string, string>,
  into: Map<string, NamedType>
): void => {
  if (!root) return

  switch (root.type) {
    case 'ref': {
      const refName = toRefName(root.$ref)
      const name = schemaNames[refName] ?? refName
      if (into.has(name)) return

      const resolved = root.resolve()
      into.set(name, { name, schema: resolved, description: schemaDescription(resolved) })
      collectNamedTypes(resolved, schemaNames, into)
      return
    }
    case 'object':
      for (const property of Object.values(root.properties ?? {})) {
        collectNamedTypes(property, schemaNames, into)
      }
      return
    case 'array':
      collectNamedTypes(root.items, schemaNames, into)
      return
    case 'union':
      for (const member of root.members) {
        collectNamedTypes(member, schemaNames, into)
      }
      return
    default:
      return
  }
}

/**
 * Render a named type's declaration: an object becomes an `interface`,
 * everything else (enum, union, scalar, array) a `type` alias. Inline
 * sub-objects are lifted into `export namespace <Name> { … }` and referenced
 * as `<Name>.<Child>` (the Stainless layout); the recursion nests a child's
 * own inline objects further.
 */
export const toTypeDeclaration = (named: NamedType, schemaNames: Record<string, string>): string => {
  const jsDoc = named.description ? `${toJsDoc(named.description)}\n` : ''

  if (named.schema.type === 'object') {
    const children: NamedType[] = []
    const body = toInterfaceBody(named.schema, schemaNames, { ownerName: named.name, children })
    const interfaceDeclaration = `${jsDoc}export interface ${named.name} ${body}`

    if (children.length === 0) {
      return interfaceDeclaration
    }

    const namespaceBody = children.map(child => toTypeDeclaration(child, schemaNames)).join('\n\n')
    return `${interfaceDeclaration}\n\nexport namespace ${named.name} {\n${namespaceBody}\n}`
  }

  return `${jsDoc}export type ${named.name} = ${toTsType(named.schema, schemaNames)};`
}
