import { SnippetBase, type GenerateContextType, type OasSchema, type OasRef, type OasObject, type RefParts } from '@skmtc/core'
import { List } from '@skmtc/lang-typescript'
import { Name } from './Name.ts'
import { AliasTypeInfo, TypeInfo, UnresolvedTypeInfo } from './TypeInfo.ts'
import { DescriptionClause } from './Description.ts'
import { toSiteSchema, type SiteSchema } from '../safeResolve.ts'

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
type SchemaRowPart = Name | TypeInfo | AliasTypeInfo | UnresolvedTypeInfo | Title | DescriptionClause

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
  links: RefParts[]

  constructor({ context, name, schema, required, description, depth = 0 }: SchemaArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    const site = toSiteSchema(schema)
    // What the row reads its title and description from: the schema it shows,
    // or, for an alias or a `$ref` that names nothing, the keywords next to the `$ref`.
    const shown = site.type === 'schema' ? site.schema : schema
    const title = shown.title
    const descriptionText = (description ?? shown.description)?.trim()
    const expansion = toExpansion(schema)
    const typeInfo = toSiteTypeInfo({ context, schema, required, site })
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
  links: RefParts[]

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

type ToSiteTypeInfoArgs = {
  context: GenerateContextType
  schema: OasSchema | OasRef<'schema'>
  required: boolean | undefined
  site: SiteSchema
}

const toSiteTypeInfo = ({
  context,
  schema,
  required,
  site
}: ToSiteTypeInfoArgs): TypeInfo | AliasTypeInfo | UnresolvedTypeInfo => {
  switch (site.type) {
    case 'schema':
      return new TypeInfo({ context, schema, resolved: site.schema, required })
    case 'alias':
      return new AliasTypeInfo({ context, schema, required })
    case 'dangling':
      return new UnresolvedTypeInfo({ context, schema, required })
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

  switch (schema.type) {
    case 'object':
      return [...toObjectProperties(schema), ...toAdditionalProperties(schema)]
    case 'array':
      return toExpansion(schema.items)
    case 'union':
      return schema.members.map(member => ({ name: undefined, schema: member, required: undefined }))
    case 'string':
    case 'number':
    case 'integer':
    case 'boolean':
    case 'unknown':
      return []
    default: {
      const _exhaustive: never = schema
      throw new Error(`Unhandled schema type: ${Reflect.get(_exhaustive, 'type')}`)
    }
  }
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
