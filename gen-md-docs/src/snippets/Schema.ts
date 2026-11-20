import { SnippetBase, type GenerateContextType, type OasSchema, type OasRef, type OasObject, type RefName } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { match, P } from 'ts-pattern'
import { Name } from './Name.ts'
import { TypeInfo, UnresolvedTypeInfo } from './TypeInfo.ts'
import { DescriptionClause } from './Description.ts'
import { safeResolve } from '../safeResolve.ts'

type SchemaArgs = {
  context: GenerateContextType
  name: string | undefined
  schema: OasSchema | OasRef<'schema'>
  required: boolean | undefined
  /** An external description (e.g. a parameter's), used in place of the schema's own when present. */
  description?: string
  depth?: number
}

/** One part of a schema's row. */
type SchemaRowPart = Name | TypeInfo | UnresolvedTypeInfo | Title | DescriptionClause

/**
 * Renders one schema node as a Markdown row, then its children's rows in a
 * nested {@link Properties} — the counterpart of the docs viewer's recursive
 * `Schema`. The row is its name, its type annotation, its title and its
 * description, each only when it has one.
 *
 * A `$ref` renders as a leaf by its name, linked to its definition in the
 * "Referenced types" section of the document it is written in. Inline
 * (anonymous) schemas have no name to reference, so they expand in place.
 *
 * The rows link to types by anchor and depend on no document, so one type's
 * rows serve every document that defines it. A `DocumentSchema` places them in
 * a document and defines the types they link to ({@link Schema.links}) there.
 */
export class Schema extends SnippetBase {
  /** The row, then the children's rows when it has any. */
  lines: List<(List<SchemaRowPart[], ' ', 'none'> | Properties)[], '\n', 'none'>
  /** The component schemas the rows link to, in order; a type linked twice is listed twice. */
  links: RefName[]

  constructor({ context, name, schema, required, description, depth = 0 }: SchemaArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    const resolved = safeResolve(schema)
    const title = resolved?.title
    const descriptionText = (description ?? resolved?.description)?.trim()
    const expansion = toExpansion(schema)
    const typeInfo =
      resolved !== undefined
        ? new TypeInfo({ context, schema, resolved, required })
        : new UnresolvedTypeInfo({ context, schema, required })
    const properties = expansion.length > 0 ? new Properties({ context, properties: expansion, depth }) : undefined

    this.links = [...typeInfo.links, ...(properties?.links ?? [])]
    this.lines = new List(
      [
        new List<SchemaRowPart[], ' ', 'none'>(
          [
            name ? new Name({ context, name }) : undefined,
            typeInfo,
            title ? new Title({ context, title }) : undefined,
            descriptionText ? new DescriptionClause({ context, description: descriptionText }) : undefined
          ],
          { separator: ' ' }
        ),
        properties
      ],
      { separator: '\n' }
    )
  }

  override toString(): string {
    return `${this.lines}`
  }
}

type TitleArgs = {
  context: GenerateContextType
  title: string
}

/** A schema's title, in italics: `_Pet_`. */
class Title extends SnippetBase {
  title: string

  constructor({ context, title }: TitleArgs) {
    super({ context })

    this.title = title
  }

  override toString(): string {
    return `_${this.title}_`
  }
}

type Property = {
  name: string | undefined
  schema: OasSchema | OasRef<'schema'>
  required: boolean | undefined
}

type PropertiesArgs = {
  context: GenerateContextType
  properties: Property[]
  depth: number
}

/**
 * Renders a container's children as an indented bullet list, one nested
 * {@link Schema} per property — the recursion holder, mirroring
 * gen-typescript's `TsObjectProperties`.
 */
class Properties extends SnippetBase {
  rows: List<PropertyRow[], '\n', 'none'>
  /** The component schemas the rows link to. */
  links: RefName[]

  constructor({ context, properties, depth }: PropertiesArgs) {
    super({ context })

    const schemas = properties.map(property => new Schema({ context, ...property, depth: depth + 1 }))

    this.links = schemas.flatMap(schema => schema.links)
    this.rows = new List(
      schemas.map(schema => new PropertyRow({ context, depth, schema })),
      { separator: '\n' }
    )
  }

  override toString(): string {
    return `${this.rows}`
  }
}

type PropertyRowArgs = {
  context: GenerateContextType
  depth: number
  schema: Schema
}

/** One child's bullet, indented to its depth: `  - **id** \`integer\``. */
class PropertyRow extends SnippetBase {
  depth: number
  schema: Schema

  constructor({ context, depth, schema }: PropertyRowArgs) {
    super({ context })

    this.depth = depth
    this.schema = schema
  }

  override toString(): string {
    return `${'  '.repeat(this.depth)}- ${this.schema}`
  }
}

/**
 * The child property specs of a schema node — an object's own properties, an
 * array's (flattened) item properties, a union's members. A `$ref` is a leaf
 * and contributes no inline children; nor does a scalar.
 */
const toExpansion = (schema: OasSchema | OasRef<'schema'>): Property[] => {
  if (schema.isRef()) {
    return []
  }

  return match(schema)
    .with({ type: 'object' }, object => [...toObjectProperties(object), ...toAdditionalProperties(object)])
    .with({ type: 'array' }, array => toExpansion(array.items))
    .with({ type: 'union' }, union =>
      union.members.map(member => ({ name: undefined, schema: member, required: undefined }))
    )
    .with({ type: P.union('string', 'number', 'integer', 'boolean', 'unknown') }, () => [])
    .exhaustive()
}

const toObjectProperties = (object: OasObject): Property[] =>
  Object.entries(object.properties ?? {}).flatMap(([name, schema]) =>
    schema.type === 'custom' ? [] : [{ name, schema, required: object.required?.includes(name) }]
  )

/** A map's value type, as an `«additional properties»` row, when it is a schema (not a boolean). */
const toAdditionalProperties = (object: OasObject): Property[] =>
  object.additionalProperties !== undefined && typeof object.additionalProperties !== 'boolean'
    ? [{ name: '«additional properties»', schema: object.additionalProperties, required: undefined }]
    : []
