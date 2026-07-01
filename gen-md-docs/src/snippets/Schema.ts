import {
  camelCase,
  SnippetBase,
  type GenerateContextType,
  type OasSchema,
  type OasRef,
  type OasObject,
  type RefName
} from '@skmtc/core'
import { Name } from './Name.ts'
import { TypeInfo } from './TypeInfo.ts'
import { Description } from './Description.ts'
import { safeResolve } from '../safeResolve.ts'

type SchemaArgs = {
  context: GenerateContextType
  name: string | undefined
  schema: OasSchema | OasRef<'schema'>
  required: boolean | undefined
  /** An external description (e.g. a parameter's), used in place of the schema's own when present. */
  description?: string
  /** Collector for the `$ref` types referenced here — see {@link Definitions}. */
  definitions?: Definitions
  depth?: number
}

/**
 * Renders one schema node as a Markdown row, delegating any container's children
 * to a nested {@link Properties} — the counterpart of the docs viewer's
 * recursive `Schema`.
 *
 * A `$ref` renders as a leaf by its name and is **registered** with
 * {@link Definitions}, which renders each referenced type once in a shared
 * "Referenced types" section of the same document. Inline (anonymous) schemas
 * have no name to reference, so they expand in place.
 */
export class Schema extends SnippetBase {
  name: Name
  typeInfo: TypeInfo
  description: Description
  properties: Properties | undefined

  constructor({
    context,
    name,
    schema,
    required,
    description,
    definitions = new Definitions({ context }),
    depth = 0
  }: SchemaArgs) {
    super({ context, stackTrail: schema.stackTrail.clone() })

    const resolved = safeResolve(schema)
    const properties = toExpansion(schema, definitions)

    this.name = new Name({ context, name })
    this.typeInfo = new TypeInfo({ context, schema, required })
    this.description = new Description({
      context,
      description:
        description ??
        (resolved !== undefined && 'description' in resolved ? resolved.description : undefined)
    })
    this.properties =
      properties.length > 0
        ? new Properties({ context, properties, definitions, depth })
        : undefined
  }

  override toString(): string {
    const description = this.description.toString()
    const row = [`${this.name}`, `${this.typeInfo}`, description && `— ${description}`]
      .filter(part => part !== '')
      .join(' ')

    return this.properties ? `${row}\n${this.properties}` : row
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
  definitions: Definitions
  depth: number
}

/**
 * Renders a container's children as an indented bullet list, one nested
 * {@link Schema} per property — the recursion holder, mirroring
 * gen-typescript's `TsObjectProperties`. Threads {@link Definitions} so nested
 * `$ref`s register.
 */
class Properties extends SnippetBase {
  depth: number
  rows: Schema[]

  constructor({ context, properties, definitions, depth }: PropertiesArgs) {
    super({ context })

    this.depth = depth
    this.rows = properties.map(
      property => new Schema({ context, ...property, definitions, depth: depth + 1 })
    )
  }

  override toString(): string {
    const indent = '  '.repeat(this.depth)

    return this.rows.map(row => `${indent}- ${row}`).join('\n')
  }
}

/**
 * The child property specs of a schema node — an object's own properties, an
 * array's (flattened) item properties, a union's members. A `$ref` is a leaf:
 * it registers with {@link Definitions} (so its type is defined once, later) and
 * contributes no inline children. Empty for a scalar leaf too.
 */
const toExpansion = (
  schema: OasSchema | OasRef<'schema'>,
  definitions: Definitions
): Property[] => {
  if (schema.isRef()) {
    if (safeResolve(schema) !== undefined) {
      definitions.add(schema)
    }

    return []
  }

  switch (schema.type) {
    case 'object':
      return toObjectProperties(schema)
    case 'array':
      return toExpansion(schema.items, definitions)
    case 'union':
      return schema.members.map(member => ({ name: undefined, schema: member, required: undefined }))
    case 'string':
    case 'number':
    case 'integer':
    case 'boolean':
    case 'unknown':
      return []
    default: {
      const exhaustive: never = schema
      throw new Error(`Unhandled schema type: ${JSON.stringify(exhaustive)}`)
    }
  }
}

const toObjectProperties = (object: OasObject): Property[] =>
  Object.entries(object.properties ?? {}).flatMap(([name, schema]) =>
    schema.type === 'custom' ? [] : [{ name, schema, required: object.required?.includes(name) }]
  )

/**
 * Collects the `$ref` types referenced across one document and renders each of
 * them once, in a "Referenced types" section. A referenced type's own `$ref`s
 * register in turn ({@link build} drains the queue to a fixpoint), so a
 * recursive schema is defined once and its self-reference reads as a name — no
 * loop, no repetition.
 */
export class Definitions extends SnippetBase {
  private seen: Set<RefName> = new Set()
  private queue: OasRef<'schema'>[] = []
  private entries: TypeDefinition[] = []

  add(ref: OasRef<'schema'>): void {
    const name = ref.toRefName()

    if (!this.seen.has(name)) {
      this.seen.add(name)
      this.queue.push(ref)
    }
  }

  /** Render every queued type — resolving each may register more, so drain to empty. */
  build(): void {
    let next = this.queue.shift()

    while (next !== undefined) {
      this.entries.push(new TypeDefinition({ context: this.context, ref: next, definitions: this }))
      next = this.queue.shift()
    }
  }

  override toString(): string {
    if (this.entries.length === 0) {
      return ''
    }

    return ['## Referenced types', ...this.entries.map(entry => entry.toString())].join('\n\n')
  }
}

type TypeDefinitionArgs = {
  context: GenerateContextType
  ref: OasRef<'schema'>
  definitions: Definitions
}

/** One entry in the {@link Definitions} section: `### Name` over the resolved type's shape. */
class TypeDefinition extends SnippetBase {
  name: string
  schema: Schema | undefined

  constructor({ context, ref, definitions }: TypeDefinitionArgs) {
    super({ context, stackTrail: ref.stackTrail.clone() })

    const resolved = safeResolve(ref)

    this.name = camelCase(ref.toRefName(), { upperFirst: true })
    this.schema =
      resolved !== undefined
        ? new Schema({ context, name: undefined, schema: resolved, required: undefined, definitions })
        : undefined
  }

  override toString(): string {
    return this.schema !== undefined ? `### ${this.name}\n\n${this.schema}` : `### ${this.name}`
  }
}
