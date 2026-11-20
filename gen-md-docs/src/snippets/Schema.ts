import { SnippetBase, type GenerateContextType, type OasSchema, type OasRef, type OasObject } from '@skmtc/core'
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
  /** The document the schema is written in, where a `$ref` it links to is defined. */
  destinationPath: string
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
 * "Referenced types" section of the same document. Inline (anonymous) schemas
 * have no name to reference, so they expand in place.
 */
export class Schema extends SnippetBase {
  /** The row, then the children's rows when it has any. */
  lines: List<(List<SchemaRowPart[], ' ', 'none'> | Properties)[], '\n', 'none'>

  constructor({
    context,
    name,
    schema,
    required,
    description,
    destinationPath,
    depth = 0
  }: SchemaArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    const resolved = safeResolve(schema)
    const title = resolved?.title
    const descriptionText = (description ?? resolved?.description)?.trim()
    const properties = toExpansion(schema)

    const row = new List<SchemaRowPart[], ' ', 'none'>(
      [
        name ? new Name({ context, name }) : undefined,
        resolved !== undefined
          ? new TypeInfo({ context, schema, resolved, required, destinationPath })
          : new UnresolvedTypeInfo({ context, schema, required, destinationPath }),
        title ? new Title({ context, title }) : undefined,
        descriptionText ? new DescriptionClause({ context, description: descriptionText }) : undefined
      ],
      { separator: ' ' }
    )

    this.lines = new List(
      [row, properties.length > 0 ? new Properties({ context, properties, destinationPath, depth }) : undefined],
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
  destinationPath: string
  depth: number
}

/**
 * Renders a container's children as an indented bullet list, one nested
 * {@link Schema} per property — the recursion holder, mirroring
 * gen-typescript's `TsObjectProperties`.
 */
class Properties extends SnippetBase {
  rows: List<PropertyRow[], '\n', 'none'>

  constructor({ context, properties, destinationPath, depth }: PropertiesArgs) {
    super({ context })

    this.rows = new List(
      properties.map(
        property =>
          new PropertyRow({
            context,
            depth,
            schema: new Schema({ context, ...property, destinationPath, depth: depth + 1 })
          })
      ),
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
